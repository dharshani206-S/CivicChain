import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { issuesAPI } from "@/services/api";
import type { Issue } from "@/types/issue";
import { toIssueArray } from "@/utils/api";

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

interface LocationPickerMapProps {
  latitude: string;
  longitude: string;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

// Custom Leaflet Marker Icon for Selected Pin
const createSelectedPinIcon = () => {
  const svg = `
    <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/>
      <circle cx="12" cy="12" r="4" fill="#ffffff"/>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: "location-picker-selected-marker",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const parseCoordinate = (val?: string | number): number | null => {
  if (val === undefined || val === null || val === "") return null;
  const num = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
};

const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  className = "h-[350px] w-full rounded-xl",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const [nearbyIssues, setNearbyIssues] = useState<Issue[]>([]);

  // Default coordinates fallback: Puducherry / Town center default (11.931817, 79.818753)
  const currentLat = useMemo(() => parseCoordinate(latitude) ?? 11.931817, [latitude]);
  const currentLng = useMemo(() => parseCoordinate(longitude) ?? 79.818753, [longitude]);

  // Fetch public geotagged issues for heat density visualization
  useEffect(() => {
    let active = true;
    const loadIssues = async () => {
      try {
        const res = await issuesAPI.getAll();
        if (active) {
          const list = toIssueArray(res.data);
          setNearbyIssues(list);
        }
      } catch (err) {
        // Silently handle public issue fetch fallback
        console.warn("Could not fetch public issues for map background heat:", err);
      }
    };
    void loadIssues();
    return () => {
      active = false;
    };
  }, []);

  // Compute Heatmap Points (Selected location + nearby issue density)
  const heatPoints = useMemo(() => {
    const points: Array<[number, number, number]> = [];

    // 1. Primary heat point centered at selected location
    points.push([currentLat, currentLng, 0.95]);

    // 2. Surrounding ambient heat ring around selected location
    const offsets = [
      [0.0008, 0.0008],
      [-0.0008, -0.0008],
      [0.0008, -0.0008],
      [-0.0008, 0.0008],
    ];
    offsets.forEach(([dLat, dLng]) => {
      points.push([currentLat + dLat, currentLng + dLng, 0.45]);
    });

    // 3. Nearby public issue heat density
    nearbyIssues.forEach((issue) => {
      const lat = parseCoordinate(issue.latitude);
      const lng = parseCoordinate(issue.longitude);
      if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          let intensity = 0.5;
          if (issue.votes >= 20 || issue.status === "critical") intensity = 0.9;
          points.push([lat, lng, intensity]);
        }
      }
    });

    return points;
  }, [currentLat, currentLng, nearbyIssues]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | CivicChain',
        maxZoom: 19,
      }).addTo(map);

      // Handle map click to update selected location
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);
      });

      // Initial Marker
      const icon = createSelectedPinIcon();
      const marker = L.marker([currentLat, currentLng], { icon, draggable: true }).addTo(map);
      marker.bindPopup("<b>Selected Complaint Location</b><br/>Click map or drag pin to adjust");

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onLocationSelect(position.lat, position.lng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync Map view and Marker position when coordinates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.setView([currentLat, currentLng], map.getZoom(), { animate: true });

    if (markerRef.current) {
      markerRef.current.setLatLng([currentLat, currentLng]);
    }

    // Invalidate map size so Leaflet resizes correctly inside tab steps
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [currentLat, currentLng]);

  // Sync Heat Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (heatPoints.length > 0) {
      const gradient = {
        0.2: "#3b82f6", // Blue (low density)
        0.5: "#10b981", // Green (low-med density)
        0.7: "#f97316", // Orange (high-med density)
        1.0: "#ef4444", // Red (high density)
      };

      try {
        const heat = L.heatLayer(heatPoints, {
          radius: 28,
          blur: 16,
          maxZoom: 16,
          max: 1.0,
          gradient,
        });

        heat.addTo(map);
        heatLayerRef.current = heat;
      } catch (err) {
        console.warn("Location picker heat layer notice:", err);
      }
    }
  }, [heatPoints]);

  return (
    <div className={`relative overflow-hidden border border-zinc-200 shadow-sm ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full z-0" />
      
      {/* Map instruction overlay */}
      <div className="absolute top-3 left-3 z-[1000] rounded-lg border border-zinc-200/80 bg-white/90 backdrop-blur-md px-3 py-1.5 text-[11px] shadow-md font-sans">
        <span className="font-bold text-zinc-800">📍 Click map or drag pin</span> to adjust location
      </div>

      {/* Selected Coordinates Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] rounded-md bg-zinc-900/90 text-white backdrop-blur-md px-3 py-1.5 text-[10px] font-mono shadow-md">
        <span>Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}</span>
      </div>
    </div>
  );
};

export default LocationPickerMap;
