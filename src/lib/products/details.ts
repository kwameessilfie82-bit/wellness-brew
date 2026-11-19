/**
 * Product page facts stored in `product.details` (JSONB). Client + server safe.
 * Every field is optional in storage; `parseProductDetails` fills blanks so old
 * rows and partial saves always render.
 */
import { z } from "zod";

const str = (max = 500) => z.string().trim().max(max);

export const BREW_STYLES = ["hot", "iced", "both"] as const;

export const productDetailsSchema = z.object({
  ingredients: str(1000),
  tastingNotes: str(500),
  brewing: z.object({
    waterMl: z.number().int().min(0).max(5000).nullable(),
    tempC: z.number().int().min(0).max(100).nullable(),
    minutes: str(20),
    style: z.enum(BREW_STYLES).nullable(),
    instructions: str(1000),
  }),
  storage: str(300),
  shelfLife: str(100),
  cautions: str(1000),
  netWeight: str(40),
  servingSize: str(60),
  /** Number of bags / servings in the pack; used for "price per bag". */
  servingsPerPack: z.number().int().min(0).max(10_000).nullable(),
  /** Taxonomy term ids (Settings → Taxonomy). */
  terms: z.array(z.string().trim().min(1).max(64)).max(40),
  faq: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(64),
        question: str(300).min(1, "Question is required"),
        answer: str(2000),
      }),
    )
    .max(20),
});
export type ProductDetails = z.infer<typeof productDetailsSchema>;

export const EMPTY_DETAILS: ProductDetails = {
  ingredients: "",
  tastingNotes: "",
  brewing: { waterMl: null, tempC: null, minutes: "", style: null, instructions: "" },
  storage: "",
  shelfLife: "",
  cautions: "",
  netWeight: "",
  servingSize: "",
  servingsPerPack: null,
  terms: [],
  faq: [],
};

/** Lenient read: invalid or missing parts fall back to empty values. */
export function parseProductDetails(raw: unknown): ProductDetails {
  if (!raw || typeof raw !== "object") return EMPTY_DETAILS;
  const r = raw as Record<string, unknown>;
  const merged = {
    ...EMPTY_DETAILS,
    ...r,
    brewing: { ...EMPTY_DETAILS.brewing, ...((r.brewing as object) ?? {}) },
  };
  const parsed = productDetailsSchema.safeParse(merged);
  return parsed.success ? parsed.data : EMPTY_DETAILS;
}

/** Price per bag/serving, rounded to pesewas, or null. */
export function pricePerServing(price: number, details: ProductDetails): number | null {
  const n = details.servingsPerPack;
  if (!n || n <= 0 || !(price > 0)) return null;
  return Math.round((price / n) * 100) / 100;
}

/**
 * Completeness against the Catalogue QA template: each check is one point.
 * green ≥ 85%, amber ≥ 50%, red below.
 */
export function productCompleteness(p: {
  description?: string | null;
  images?: string[] | string | null;
  fdaRegNumber?: string | null;
  details: ProductDetails;
}): { score: number; level: "green" | "amber" | "red"; missing: string[] } {
  const images = Array.isArray(p.images)
    ? p.images
    : (() => {
        try {
          const v = JSON.parse(p.images || "[]");
          return Array.isArray(v) ? v : [];
        } catch {
          return [];
        }
      })();
  const d = p.details;
  const checks: [string, boolean][] = [
    ["Description (60+ characters)", (p.description ?? "").trim().length >= 60],
    ["At least 2 photos", images.length >= 2],
    ["FDA registration number", !!p.fdaRegNumber?.trim()],
    ["Ingredients", !!d.ingredients],
    ["Tasting notes", !!d.tastingNotes],
    ["Brewing guide", !!(d.brewing.instructions || (d.brewing.tempC && d.brewing.minutes))],
    ["Storage", !!d.storage],
    ["Shelf life", !!d.shelfLife],
    ["Cautions", !!d.cautions],
    ["Net weight", !!d.netWeight],
    ["Bags / servings per pack", !!d.servingsPerPack],
    ["Taxonomy tags", d.terms.length > 0],
    ["Product FAQ", d.faq.length > 0],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label);
  const score = Math.round(((checks.length - missing.length) / checks.length) * 100);
  return { score, level: score >= 85 ? "green" : score >= 50 ? "amber" : "red", missing };
}
