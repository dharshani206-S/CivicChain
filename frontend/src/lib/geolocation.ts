export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type GeolocationErrorReason =
  | "unsupported"
  | "insecure_context"
  | "permission_denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export class GeolocationError extends Error {
  reason: GeolocationErrorReason;

  constructor(reason: GeolocationErrorReason, message: string) {
    super(message);
    this.name = "GeolocationError";
    this.reason = reason;
  }
}

export const getCurrentCoordinates = (options?: PositionOptions): Promise<Coordinates> =>
  new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeolocationError("unsupported", "Geolocation is not supported by this browser."));
      return;
    }

    // Browsers block Geolocation on non-secure origins (anything other than HTTPS or localhost).
    // This frequently happens in LAN/dev scenarios where the app is opened via an IP over HTTP.
    if (!window.isSecureContext) {
      reject(new GeolocationError("insecure_context", "Location requires HTTPS (or localhost)."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new GeolocationError("permission_denied", "Location permission denied."));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new GeolocationError("unavailable", "Location unavailable."));
        } else if (err.code === err.TIMEOUT) {
          reject(new GeolocationError("timeout", "Location request timed out."));
        } else {
          reject(new GeolocationError("unknown", "Failed to get location."));
        }
      },
      options,
    );
  });

type NominatimReverseResponse = {
  display_name?: unknown;
  address?: Record<string, unknown>;
};

const compact = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const pickFirst = (address: Record<string, unknown> | undefined, keys: string[]): string | null => {
  if (!address) return null;
  for (const key of keys) {
    const v = compact(address[key]);
    if (v) return v;
  }
  return null;
};

export const reverseGeocode = async (coords: Coordinates): Promise<string | null> => {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(coords.latitude));
    url.searchParams.set("lon", String(coords.longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as NominatimReverseResponse;
    const displayName = compact(data.display_name);
    const address = data.address && typeof data.address === "object" ? data.address : undefined;

    const roadOrArea =
      pickFirst(address, ["road", "neighbourhood", "suburb", "hamlet", "village", "town", "city"]) ?? null;
    const cityOrDistrict = pickFirst(address, ["city", "town", "village", "county", "state_district"]);
    const state = pickFirst(address, ["state"]);

    const short = [roadOrArea, cityOrDistrict, state].filter(Boolean).join(", ");
    return short || displayName;
  } catch {
    return null;
  }
};
