// List of departments (used for dropdowns)
export const DEPARTMENTS = [
  "Sanitation",
  "Sewerage",
  "Public Works",
  "Street Lights",
] as const;

export type Department = (typeof DEPARTMENTS)[number];