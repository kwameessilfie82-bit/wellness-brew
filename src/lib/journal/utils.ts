/** Client-safe helpers for the Brew Journal. */

export function readingMinutes(body: string): number {
  return minutesFromWords(body.trim().split(/\s+/).filter(Boolean).length);
}

export function minutesFromWords(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

export function formatPostDate(date: Date | string | null): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" });
}
