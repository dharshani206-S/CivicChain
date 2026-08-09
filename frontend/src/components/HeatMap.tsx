import React, { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { Issue } from "@/types/issue";
import { isWithinPuducherryUT } from "@/lib/puducherryGeo";

// Ambient type declaration for leaflet.heat
declare module "leaflet" {
  export function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: { [key: number]: string };
    }
  ): L.Layer;
}

interface HeatMapProps {
  issues: Issue[];
  selectedIssue?: Issue | null;
  onSelectIssue?: (issue: Issue) => void;
  className?: string;
  departmentLock?: string | null;
  /** If true, shows a single-issue focused heatmap centered on that issue */
  singleIssueMode?: boolean;
}

// Helper to safely parse coordinates
const parseCoordinate = (val?: string | number): number | null => {
  if (val === undefined || val === null || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? null : num;
};

// Heatmap gradient: Blue → Green → Yellow → Orange → Red
const HEAT_GRADIENT = {
  0.1: "#3b82f6", // Blue (lowest density)
  0.3: "#10b981", // Green (low-medium)
  0.55: "#eab308", // Yellow (medium)
  0.75: "#f97316", // Orange (high-medium)
  1.0: "#ef4444", // Red (highest density)
};

const HeatMap: React.FC<HeatMapProps> = ({
  issues,
  selectedIssue,
  onSelectIssue,
  className = "h-[400px] w-full rounded-xl",
  departmentLock,
  singleIssueMode = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Filter issues safely and validate coordinates belong strictly to Puducherry UT
  const validIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Security enforcement for department-locked authority view
      if (departmentLock && issue.department !== departmentLock) {
        return false;
      }

      const lat = parseCoordinate(issue.latitude);
      const lng = parseCoordinate(issue.longitude);

      if (lat === null || lng === null) return false;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
      // Skip zero/zero placeholder coords (invalid default)
      if (lat === 0 && lng === 0) return false;

      // Restrict heatmap display strictly to Pondicherry/Puducherry region
      if (!isWithinPuducherryUT(lat, lng)) return false;

      return true;
    });
  }, [issues, departmentLock]);

  // Compute heatmap points [lat, lng, intensity]
  const heatPoints = useMemo(() => {
    if (singleIssueMode && validIssues.length > 0) {
      const issue = validIssues[0];
      const lat = parseCoordinate(issue.latitude)!;
      const lng = parseCoordinate(issue.longitude)!;
      // Primary hot point + ambient ring for single-issue focus
      const points: Array<[number, number, number]> = [
        [lat, lng, 1.0],
        [lat + 0.0006, lng + 0.0006, 0.5],
        [lat - 0.0006, lng - 0.0006, 0.5],
        [lat + 0.0006, lng - 0.0006, 0.5],
        [lat - 0.0006, lng + 0.0006, 0.5],
        [lat + 0.0012, lng, 0.25],
        [lat - 0.0012, lng, 0.25],
        [lat, lng + 0.0012, 0.25],
        [lat, lng - 0.0012, 0.25],
      ];
      return points;
    }

    return validIssues.map((issue) => {
      const lat = parseCoordinate(issue.latitude)!;
      const lng = parseCoordinate(issue.longitude)!;

      // Intensity: weighted by votes and severity
      let intensity = 0.4;
      if (issue.status === "critical" || issue.votes >= 50) intensity = 1.0;
      else if (issue.votes >= 20) intensity = 0.85;
      else if (issue.votes >= 5) intensity = 0.65;

      return [lat, lng, intensity] as [number, number, number];
    });
  }, [validIssues, singleIssueMode]);

  // Initialize Leaflet Map — runs only once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default fallback center: Puducherry, India
      const defaultCenter: [number, number] = [11.9139, 79.8145];
      const defaultZoom = singleIssueMode ? 15 : 12;

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      // OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CivicChain',
        maxZoom: 19,
      }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // ResizeObserver to automatically invalidate Leaflet map bounds when container resizes
    let observer: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      observer = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      observer.observe(mapContainerRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        heatLayerRef.current = null;
        markersGroupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update HeatMap Layer & Markers whenever data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // --- 1. REBUILD HEATMAP LAYER ---
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (heatPoints.length > 0) {
      try {
        const heat = L.heatLayer(heatPoints, {
          radius: singleIssueMode ? 40 : 28,
          blur: singleIssueMode ? 22 : 18,
          maxZoom: 17,
          max: 1.0,
          minOpacity: 0.35,
          gradient: HEAT_GRADIENT,
        });
        heat.addTo(map);
        heatLayerRef.current = heat;
      } catch (err) {
        console.error("Heatmap layer error:", err);
      }
    }

    // --- 2. REBUILD INTERACTIVE MARKERS ---
    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();

      if (!singleIssueMode) {
        validIssues.forEach((issue) => {
          const lat = parseCoordinate(issue.latitude)!;
          const lng = parseCoordinate(issue.longitude)!;
          const isSelected = selectedIssue?._id === issue._id;

          // Subtle dot marker (does not replace heatmap visual)
          const size = isSelected ? 14 : 10;
          let color = "#f59e0b";
          if (issue.status === "resolved") color = "#10b981";
          else if (issue.status === "in-progress" || issue.status === "progress") color = "#2563eb";
          else if (issue.status === "critical") color = "#ef4444";

          const svg = `
            <svg width="${size}" height="${size}" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
              <circle cx="7" cy="7" r="5.5" fill="${color}" stroke="#ffffff" stroke-width="${isSelected ? 2 : 1.5}" />
              ${isSelected ? `<circle cx="7" cy="7" r="6.5" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.7" />` : ""}
            </svg>
          `;

          const icon = L.divIcon({
            html: svg,
            className: "civic-heat-dot-marker",
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });

          const marker = L.marker([lat, lng], { icon });

          // Compact popup
          const popupDiv = document.createElement("div");
          popupDiv.style.cssText = "font-family:system-ui,sans-serif;font-size:11px;min-width:160px;";
          popupDiv.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="background:#f1f5f9;color:#64748b;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;">${issue.department || "General"}</span>
              <span style="background:${
                issue.status === "resolved" ? "#d1fae5" :
                issue.status === "critical" ? "#ffe4e6" :
                issue.status === "in-progress" ? "#dbeafe" : "#fef3c7"
              };color:${
                issue.status === "resolved" ? "#065f46" :
                issue.status === "critical" ? "#9f1239" :
                issue.status === "in-progress" ? "#1e40af" : "#92400e"
              };padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;">${issue.status}</span>
            </div>
            <div style="font-weight:700;color:#0f172a;margin-bottom:2px;line-height:1.3;">${issue.title}</div>
            <div style="color:#94a3b8;font-size:10px;">📍 ${issue.location || "GPS Locked"} &nbsp;·&nbsp; 👍 ${issue.votes}</div>
          `;

          marker.bindPopup(popupDiv, { maxWidth: 240 });

          if (onSelectIssue) {
            marker.on("click", () => onSelectIssue(issue));
          }

          markersGroupRef.current?.addLayer(marker);
        });
      } else {
        // Single-issue mode: place one prominent pin
        if (validIssues.length > 0) {
          const issue = validIssues[0];
          const lat = parseCoordinate(issue.latitude)!;
          const lng = parseCoordinate(issue.longitude)!;

          const pinSvg = `
            <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/>
              <circle cx="14" cy="14" r="4" fill="#ffffff"/>
              <circle cx="14" cy="14" r="13" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6"/>
            </svg>
          `;
          const pinIcon = L.divIcon({
            html: pinSvg,
            className: "civic-single-issue-pin",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const pinMarker = L.marker([lat, lng], { icon: pinIcon });
          pinMarker.bindPopup(
            `<div style="font-family:system-ui,sans-serif;font-size:11px;font-weight:700;">${issue.title}</div>
             <div style="font-size:10px;color:#64748b;">📍 ${issue.location || "GPS Locked"}</div>
             <div style="font-size:10px;color:#64748b;font-family:monospace;">Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</div>`
          );
          markersGroupRef.current?.addLayer(pinMarker);
        }
      }
    }

    // --- 3. AUTO-FIT MAP BOUNDS ---
    if (validIssues.length > 0) {
      const bounds = L.latLngBounds(
        validIssues.map((issue) => [
          parseCoordinate(issue.latitude)!,
          parseCoordinate(issue.longitude)!,
        ])
      );
      if (singleIssueMode) {
        map.setView(
          [parseCoordinate(validIssues[0].latitude)!, parseCoordinate(validIssues[0].longitude)!],
          15,
          { animate: false }
        );
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [validIssues, heatPoints, selectedIssue, onSelectIssue, singleIssueMode]);

  return (
    <div className={`relative overflow-hidden border border-zinc-200 shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />

      {/* Heat Gradient Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-zinc-200/80 bg-white/92 backdrop-blur-md px-3 py-2 text-[10px] shadow-md font-sans select-none">
        <div className="font-bold text-zinc-700 mb-1.5">Heat Intensity</div>
        {/* Gradient bar */}
        <div
          className="h-2 w-28 rounded-full mb-1"
          style={{
            background: "linear-gradient(to right, #3b82f6, #10b981, #eab308, #f97316, #ef4444)",
          }}
        />
        <div className="flex justify-between text-[9px] font-semibold text-zinc-400 w-28">
          <span>Low</span>
          <span>Med</span>
          <span>High</span>
        </div>
      </div>

      {/* Empty state overlay */}
      {validIssues.length === 0 && (
        <div className="absolute top-3 right-3 z-[1000] rounded-md bg-white/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-zinc-400 border border-zinc-200 shadow-sm">
          No geotagged reports to display
        </div>
      )}
    </div>
  );
};

export default HeatMap;
