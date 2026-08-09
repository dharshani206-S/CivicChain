/**
 * Geographic validation helper for Pondicherry/Puducherry.
 * Verifies that coordinates fall inside the supported Pondicherry/Puducherry region.
 */

export interface PuducherryRegionBound {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export const PUDUCHERRY_BOUNDS: PuducherryRegionBound[] = [
  // Pondicherry / Puducherry Region
  { name: "Puducherry", minLat: 11.75, maxLat: 12.05, minLng: 79.65, maxLng: 79.90 }
];

export const isWithinPuducherryUT = (lat: number | string | undefined | null, lng: number | string | undefined | null): boolean => {
  if (lat === undefined || lat === null || lng === undefined || lng === null) return false;
  const latitude = typeof lat === "number" ? lat : parseFloat(lat);
  const longitude = typeof lng === "number" ? lng : parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;

  return PUDUCHERRY_BOUNDS.some(
    (region) =>
      latitude >= region.minLat &&
      latitude <= region.maxLat &&
      longitude >= region.minLng &&
      longitude <= region.maxLng
  );
};
