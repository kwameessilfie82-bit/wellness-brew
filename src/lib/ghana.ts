/** Ghana regions for delivery address forms */
export const GHANA_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Western North",
  "Central",
  "Eastern",
  "Northern",
  "North East",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Oti",
  "Bono",
  "Bono East",
  "Ahafo",
] as const;

export type GhanaRegion = (typeof GHANA_REGIONS)[number];

export type DeliveryAddress = {
  region: string;
  location: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
};

export function formatGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `+233${digits.slice(1)}`;
  }
  if (digits.length === 9) {
    return `+233${digits}`;
  }
  return phone.trim();
}
