/**
 * Site settings: one Zod schema + defaults per dashboard section.
 * Shared by the admin forms (client) and the save action (server).
 * Defaults keep the site rendering correctly before the owner edits anything.
 */
import { z } from "zod";

import type { DeliverySettings, OrderingSettings, WhatsappSettings } from "./ordering-schemas";

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
  /** Number for questions (not orders); shown on the contact page and footer. */
  enquiryPhone: phone,
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
  /** Mobile Money number customers send payment to. */
  momoNumber: phone,
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

// ── Compliance (public: shown in footer / product pages) ────────────────
export const REGISTRATION_STATUSES = ["approved", "pending"] as const;
export const complianceSchema = z.object({
  botanicalName: str(120),
  commonNames: str(200),
  disclaimer: str(1000),
  showDisclaimerInFooter: z.boolean(),
  showDisclaimerOnProducts: z.boolean(),
  registrations: z
    .array(
      z.object({
        id,
        label: str(120).min(1, "Label is required"),
        number: str(60),
        status: z.enum(REGISTRATION_STATUSES),
      }),
    )
    .max(50),
});
export type ComplianceSettings = z.infer<typeof complianceSchema>;

// ── Claims register + banned phrases (admin only) ────────────────────────
export const CLAIM_STATUSES = ["approved", "pending", "rejected"] as const;
export const claimsSchema = z.object({
  bannedPhrases: z
    .array(
      z.object({
        id,
        phrase: str(80).min(1, "Phrase is required"),
        reason: str(300),
        suggestion: str(300),
      }),
    )
    .max(300),
  register: z
    .array(
      z.object({
        id,
        claim: str(300).min(1, "Claim text is required"),
        status: z.enum(CLAIM_STATUSES),
        evidence: str(1000),
        usedOn: str(300),
        reviewedOn: str(30),
      }),
    )
    .max(300),
});
export type ClaimsSettings = z.infer<typeof claimsSchema>;
export type BannedPhrase = ClaimsSettings["bannedPhrases"][number];

// ── Page content (homepage + about). `{brand}` is replaced with the brand name.
export const CONTENT_ICONS = [
  "award",
  "truck",
  "leaf",
  "heart",
  "sparkles",
  "shield",
  "clock",
  "gift",
  "coffee",
  "sun",
  "star",
  "message",
] as const;
export const homepageSchema = z.object({
  badge: str(80),
  titleLead: str(120).min(1, "Headline is required"),
  titleHighlight: str(120),
  subtitle: str(400),
  primaryCtaLabel: str(40),
  primaryCtaHref: optionalUrl,
  secondaryCtaLabel: str(40),
  secondaryCtaHref: optionalUrl,
  heroImageUrl: optionalUrl,
  heroImageAlt: str(200),
  featuredEyebrow: str(60),
  featuredTitle: str(120),
  featuredSubtitle: str(300),
  valueProps: z
    .array(
      z.object({
        id,
        icon: z.enum(CONTENT_ICONS),
        title: str(80).min(1, "Title is required"),
        text: str(300),
      }),
    )
    .max(6),
  /** Animated "meet the blends" image strip. Empty list hides it. */
  showcaseEyebrow: str(60),
  showcaseTitle: str(120),
  showcaseSubtitle: str(300),
  showcase: z
    .array(
      z.object({
        id,
        url: optionalUrl.refine((v) => v !== "", { message: "Image is required" }),
        title: str(80),
        href: optionalUrl,
      }),
    )
    .max(12),
  closingTitle: str(120),
  closingText: str(300),
  closingCtaLabel: str(40),
  closingCtaHref: optionalUrl,
});
export type HomepageContent = z.infer<typeof homepageSchema>;

export const aboutSchema = z.object({
  title: str(120).min(1, "Title is required"),
  intro: str(1000),
  storyTitle: str(120),
  story: str(4000),
  missionTitle: str(120),
  mission: str(4000),
  images: z
    .array(z.object({ id, url: optionalUrl.refine((v) => v !== "", { message: "Image is required" }), alt: str(200) }))
    .max(8),
});
export type AboutContent = z.infer<typeof aboutSchema>;

// ── Types shared by client + server (no values that leak payments data) ──
export type SettingsMap = {
  brand: BrandSettings;
  contact: ContactSettings;
  locations: LocationsSettings;
  social: SocialSettings;
  compliance: ComplianceSettings;
  payments: PaymentsSettings;
  homepage: HomepageContent;
  about: AboutContent;
  claims: ClaimsSettings;
  ordering: OrderingSettings;
  delivery: DeliverySettings;
  whatsapp: WhatsappSettings;
};
export type SettingsSection = keyof SettingsMap;
export const PUBLIC_SECTIONS = ["brand", "contact", "locations", "social", "compliance"] as const;
/** The only Payments fields allowed on the public site (bank details stay private). */
export type PublicPayment = { momoNumber: string; momoProvider: string; momoMerchantName: string };
export type PublicSettings = Pick<SettingsMap, (typeof PUBLIC_SECTIONS)[number]> & { payment: PublicPayment };
export const pickPublicPayment = (p: PaymentsSettings): PublicPayment => ({
  momoNumber: p.momoNumber,
  momoProvider: p.momoProvider,
  momoMerchantName: p.momoMerchantName,
});

/** Wellness Brew logo: light version (white background) and dark version (black background). */
export const DEFAULT_LOGO_LIGHT = "/logo-light.png";
export const DEFAULT_LOGO_DARK = "/logo-dark.png";

// Public defaults: values the site shipped with before the dashboard existed.
// Payments defaults live server-side in ./registry.ts.
export const PUBLIC_DEFAULTS: PublicSettings = {
  payment: { momoNumber: "", momoProvider: "", momoMerchantName: "" },
  brand: {
    name: "Wellness Brew",
    legalName: "",
    tagline: "Your journey to wellness starts with the perfect cup.",
    promise: "",
    description: "Discover premium teas, wellness blends, and teaware.",
    logoUrl: DEFAULT_LOGO_LIGHT,
    logoDarkUrl: DEFAULT_LOGO_DARK,
    faviconUrl: "",
  },
  contact: {
    orderPhone: "+233 55 398 1862",
    whatsappNumber: "+233 54 073 4749",
    enquiryPhone: "",
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
  compliance: {
    botanicalName: "Hibiscus sabdariffa",
    commonNames: "roselle, sobolo, bissap",
    disclaimer:
      "Our teas are food products. They are not intended to diagnose, treat, cure or prevent any disease. If you are pregnant, breastfeeding, taking medication or managing a health condition, speak to your doctor before use.",
    showDisclaimerInFooter: true,
    showDisclaimerOnProducts: true,
    registrations: [],
  },
};

/** Replace `{brand}` placeholders in owner-written copy. */
export function fillBrand(text: string, brandName: string): string {
  return text.replaceAll("{brand}", brandName);
}

/** Split owner-written long text into paragraphs on blank lines. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** wa.me link from any phone format ("+233 54 073 4749" → https://wa.me/233540734749). */
export function whatsappLink(number: string, text?: string): string {
  let digits = number.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Old placeholder logo; settings still pointing at it get the new logos. */
const LEGACY_LOGOS = new Set(["", "/leafyvibestea.png"]);

/** Resolve the logo pair to show. A custom upload in Settings wins; otherwise the default pair. */
export function brandLogos(brand: { logoUrl?: string | null; logoDarkUrl?: string | null }): { light: string; dark: string } {
  const custom = !LEGACY_LOGOS.has(brand.logoUrl ?? "");
  const light = custom ? (brand.logoUrl as string) : DEFAULT_LOGO_LIGHT;
  const dark = brand.logoDarkUrl && !LEGACY_LOGOS.has(brand.logoDarkUrl) ? brand.logoDarkUrl : custom ? light : DEFAULT_LOGO_DARK;
  return { light, dark };
}

export function telLink(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, "")}`;
}

/**
 * Owner-supplied image URLs (Blob proxy `/api/media?u=…` or external https)
 * can't go through the Next image optimizer without config; serve them as-is.
 */
export function isUnoptimizedImage(src: string): boolean {
  return src.includes("?") || /^https?:\/\//i.test(src);
}
