/** Coerce DB decimal / string prices to a safe number for math & display. */
export function parsePrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function formatPrice(value: unknown, currency = "GHS"): string {
  return `${currency} ${parsePrice(value).toFixed(2)}`;
}

export function parseProductImages(images: unknown): string[] {
  if (Array.isArray(images)) {
    return images.filter((x): x is string => typeof x === "string");
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function getProductThumbnail(images: unknown): string {
  const list = parseProductImages(images);
  const first = list[0];
  if (!first) {
    return "/placeholder.svg";
  }
  if (
    first.startsWith("http://") ||
    first.startsWith("https://") ||
    first.startsWith("/")
  ) {
    return first;
  }
  return "/placeholder.svg";
}
