// List of departments (used for dropdowns)
export const DEPARTMENTS = [
  "Road Infrastructure",
  "Sanitation",
  "Street Lights",
  "Water Supply",
] as const;

export type Department = (typeof DEPARTMENTS)[number];