/**
 * Site settings: one Zod schema + defaults per dashboard section.
 * Shared by the admin forms (client) and the save action (server).
 * Defaults keep the site rendering correctly before the owner edits anything.
 */
import { z } from "zod";

const str = (max = 500) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), {
    message: "Must be a full https:// link or a /path",
  });
const phone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === "" || /^\+?[0-9 ()-]{7,}$/.test(v), {
    message: "Use digits, spaces and an optional leading +",
  });
const email = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
    message: "Invalid email",
  });
const id = z.string().trim().min(1).max(64);

// ── Brand ────────────────────────────────────────────────────────────────
export const brandSchema = z.object({
  name: str(80).min(1, "Brand name is required"),
  legalName: str(160),
  tagline: str(200),
  promise: str(300),
  description: str(500),
  logoUrl: optionalUrl,
  logoDarkUrl: optionalUrl,
  faviconUrl: optionalUrl,
});
export type BrandSettings = z.infer<typeof brandSchema>;

// ── Contact ──────────────────────────────────────────────────────────────
export const contactSchema = z.object({
  orderPhone: phone.min(1, "Primary order number is required"),
  whatsappNumber: phone,
  otherPhones: z
    .array(z.object({ id, label: str(60), number: phone }))
    .max(10),
  emailOrders: email,
  emailHello: email,
  emailB2B: email,
  businessHours: str(200),
  responseTime: str(200),
});
export type ContactSettings = z.infer<typeof contactSchema>;

// ── Locations ────────────────────────────────────────────────────────────
export const LOCATION_TYPES = ["pickup", "correspondence", "retail", "event"] as const;
export const locationsSchema = z.object({
  items: z
    .array(
      z.object({
        id,
        name: str(120).min(1, "Name is required"),
        address: str(300),
        type: z.enum(LOCATION_TYPES),
        mapUrl: optionalUrl,
        hours: str(200),
        isPublic: z.boolean(),
      }),
    )
    .max(50),
});
export type LocationsSettings = z.infer<typeof locationsSchema>;
export type SiteLocation = LocationsSettings["items"][number];

// ── Social profiles ──────────────────────────────────────────────────────
export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "x",
  "youtube",
  "whatsapp",
  "other",
] as const;
export const socialSchema = z.object({
  items: z
    .array(
      z.object({
        id,
        platform: z.enum(SOCIAL_PLATFORMS),
        handle: str(80),
        url: optionalUrl.refine((v) => v !== "", { message: "URL is required" }),
        showInFooter: z.boolean(),
        showInHeader: z.boolean(),
      }),
    )
    .max(20),
});
export type SocialSettings = z.infer<typeof socialSchema>;
export type SocialProfile = SocialSettings["items"][number];

// ── Payments & invoices ──────────────────────────────────────────────────
export const paymentsSchema = z.object({
  momoProvider: str(60),
  momoMerchantId: str(60),
  momoMerchantName: str(120),
  momoReference: str(60),
  momoContactLine: phone,
  bankName: str(120),
  bankAccountName: str(120),
  bankAccountNumber: str(60),
  bankBranch: str(120),
  invoiceTitle: str(120),
  invoiceAddress: str(300),
  invoiceTaxId: str(60),
  chequesPayableTo: str(160),
  invoiceNotes: str(1000),
  latePaymentPolicy: str(1000),
});
export type PaymentsSettings = z.infer<typeof paymentsSchema>;

// ── Types shared by client + server (no values that leak payments data) ──
export type SettingsMap = {
  brand: BrandSettings;
  contact: ContactSettings;
  locations: LocationsSettings;
  social: SocialSettings;
  payments: PaymentsSettings;
};
export type SettingsSection = keyof SettingsMap;
export const PUBLIC_SECTIONS = ["brand", "contact", "locations", "social"] as const;
export type PublicSettings = Pick<SettingsMap, (typeof PUBLIC_SECTIONS)[number]>;

// Public defaults: values the site shipped with before the dashboard existed.
// Payments defaults live server-side in ./registry.ts.
export const PUBLIC_DEFAULTS: PublicSettings = {
  brand: {
    name: "Wellness Brew",
    legalName: "",
    tagline: "Your journey to wellness starts with the perfect cup.",
    promise: "",
    description: "Discover premium teas, wellness blends, and teaware.",
    logoUrl: "/leafyvibestea.png",
    logoDarkUrl: "",
    faviconUrl: "",
  },
  contact: {
    orderPhone: "+233 55 398 1862",
    whatsappNumber: "+233 54 073 4749",
    otherPhones: [],
    emailOrders: "",
    emailHello: "info@leafyvibestea.com",
    emailB2B: "",
    businessHours: "",
    responseTime: "",
  },
  locations: {
    items: [
      {
        id: "default-dome",
        name: "Wellness Brew",
        address: "Parakuo Estate, Dome, Accra",
        type: "correspondence",
        mapUrl: "",
        hours: "",
        isPublic: true,
      },
    ],
  },
  social: { items: [] },
};

/** wa.me link from any phone format ("+233 54 073 4749" → https://wa.me/233540734749). */
export function whatsappLink(number: string, text?: string): string {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}
