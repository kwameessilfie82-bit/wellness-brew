/** Client-safe helpers for the customer's shared map pin. */

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function orderMapsUrl(o: { deliveryLat: number | null; deliveryLng: number | null }): string | null {
  return o.deliveryLat !== null && o.deliveryLng !== null ? mapsUrl(o.deliveryLat, o.deliveryLng) : null;
}

/** Human accuracy label, e.g. "±20 m". */
export function accuracyLabel(m: number | null | undefined): string {
  if (m === null || m === undefined) return "";
  return m >= 1000 ? `±${(m / 1000).toFixed(1)} km` : `±${Math.round(m)} m`;
}
