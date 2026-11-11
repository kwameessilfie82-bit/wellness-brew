import "server-only";

/**
 * Server-only settings registry: every section's schema and defaults,
 * including payments (bank / MoMo details), which must never reach the
 * client bundle. Client code imports ./schemas instead.
 */
import {
  aboutSchema,
  brandSchema,
  claimsSchema,
  complianceSchema,
  contactSchema,
  homepageSchema,
  locationsSchema,
  paymentsSchema,
  PUBLIC_DEFAULTS,
  type SettingsMap,
  type SettingsSection,
  socialSchema,
} from "./schemas";
import { deliverySchema, ORDERING_DEFAULTS, orderingSchema, whatsappSchema } from "./ordering-schemas";

const banned = (phrase: string, reason: string, suggestion = "") => ({
  id: `bp-${phrase.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  phrase,
  reason,
  suggestion,
});
const MEDICAL = "Medical claim. Food products can't claim to treat or prevent illness.";

/** Starter list; the owner edits it in Settings → Claims. */
const DEFAULT_BANNED_PHRASES = [
  banned("heal", MEDICAL, "comforting, soothing to sip"),
  banned("cure", MEDICAL),
  banned("remedy", MEDICAL),
  banned("medicinal", MEDICAL, "traditional ingredient"),
  banned("prevent disease", MEDICAL),
  banned("cancer", MEDICAL),
  banned("diabetes", MEDICAL),
  banned("blood pressure", MEDICAL),
  banned("hypertension", MEDICAL),
  banned("cholesterol", MEDICAL),
  banned("blood sugar", MEDICAL),
  banned("detox", "Unsubstantiated physiological claim.", "refreshing"),
  banned("cleanse", "Unsubstantiated physiological claim.", "refreshing"),
  banned("weight loss", "Weight claims need approval and evidence."),
  banned("lose weight", "Weight claims need approval and evidence."),
  banned("fat burning", "Weight claims need approval and evidence."),
  banned("boost immunity", "Immune claims need approval and evidence."),
  banned("immune", "Immune claims need approval and evidence."),
  banned("anti-inflammatory", "Needs evidence and approval."),
  banned("antioxidant", "Needs evidence and approval; add to the claim register first."),
  banned("organic", "Only with a current organic certificate.", "carefully sourced"),
  banned("100% natural", "Absolute claim that must be provable for every ingredient.", "made with hibiscus, herbs and spices"),
  banned("all natural", "Absolute claim that must be provable for every ingredient."),
  banned("chemical-free", "Misleading: everything is made of chemicals."),
  banned("rose of sharon", "Rose of Sharon is Hibiscus syriacus, a different plant from roselle (Hibiscus sabdariffa).", "hibiscus, roselle"),
  banned("miracle", "Exaggerated claim."),
  banned("clinically proven", "Needs published clinical evidence."),
  banned("doctor recommended", "Needs documented endorsement."),
  banned("FDA approved", "Only with a registration number; say \"FDA registered\" and show the number."),
  banned("guaranteed results", "Exaggerated claim."),
];

export const SETTINGS_SCHEMAS = {
  brand: brandSchema,
  contact: contactSchema,
  locations: locationsSchema,
  social: socialSchema,
  compliance: complianceSchema,
  payments: paymentsSchema,
  homepage: homepageSchema,
  about: aboutSchema,
  claims: claimsSchema,
  ordering: orderingSchema,
  delivery: deliverySchema,
  whatsapp: whatsappSchema,
} as const;

export const SETTINGS_SECTIONS = Object.keys(SETTINGS_SCHEMAS) as SettingsSection[];

export function isSettingsSection(v: unknown): v is SettingsSection {
  return typeof v === "string" && Object.hasOwn(SETTINGS_SCHEMAS, v);
}

export const SETTINGS_DEFAULTS: SettingsMap = {
  ...PUBLIC_DEFAULTS,
  payments: {
    momoProvider: "MTN",
    momoNumber: "",
    momoMerchantId: "974356",
    momoMerchantName: "PillJoint Pharmacy Limited",
    momoReference: "leafyvibestea",
    momoContactLine: "0540734749",
    bankName: "SINAPI ABA SAVINGS AND LOANS",
    bankAccountName: "PILLJOINT PHARMACY LTD",
    bankAccountNumber: "260969426301",
    bankBranch: "",
    invoiceTitle: "Hibiscus Teas",
    invoiceAddress: "Parakuo Estate, Dome, Accra",
    invoiceTaxId: "",
    chequesPayableTo: "PillJoint Pharmacy Ltd",
    invoiceNotes: "We appreciate your trust in Wellness Brew.",
    latePaymentPolicy:
      "Payment is due within 90 days. Late payments may incur a 2% monthly interest charge.",
  },
  homepage: {
    badge: "Premium hibiscus tea blends",
    titleLead: "Sip your way to",
    titleHighlight: "a better daily ritual",
    subtitle:
      "Handcrafted blends of hibiscus, herbs and spices, made with care and delivered to your door.",
    primaryCtaLabel: "Shop the collection",
    primaryCtaHref: "/shop",
    secondaryCtaLabel: "Our story",
    secondaryCtaHref: "/about",
    heroImageUrl: "/hero_image.webp",
    heroImageAlt: "{brand} hibiscus tea blends",
    featuredEyebrow: "Curated for you",
    featuredTitle: "Featured blends",
    featuredSubtitle: "Customer favourites for your daily ritual",
    valueProps: [
      {
        id: "vp-quality",
        icon: "award",
        title: "Premium quality",
        text: "Sourced from trusted growers and blended with care",
      },
      {
        id: "vp-delivery",
        icon: "truck",
        title: "Delivery or pickup",
        text: "Order on WhatsApp and we'll arrange delivery across Ghana or pickup",
      },
      {
        id: "vp-ingredients",
        icon: "leaf",
        title: "Simple ingredients",
        text: "Hibiscus, herbs and spices. Every ingredient is listed on the pack",
      },
    ],
    showcaseEyebrow: "Meet the blends",
    showcaseTitle: "A flavour for every mood",
    showcaseSubtitle: "Bold roselle hibiscus, paired with spices, fruit and herbs.",
    showcase: [
      { id: "sc-cinnamon", url: "/gallery/brew-1.webp", title: "Cinnamon Hibiscus", href: "/shop" },
      { id: "sc-ginger", url: "/gallery/brew-2.webp", title: "Cloves Ginger Hibiscus", href: "/shop" },
      { id: "sc-orange", url: "/gallery/brew-3.webp", title: "Orange Hibiscus", href: "/shop" },
      { id: "sc-prekese", url: "/gallery/brew-4.webp", title: "Prekese Hibiscus", href: "/shop" },
      { id: "sc-moringa", url: "/gallery/brew-5.webp", title: "Moringa Hibiscus", href: "/shop" },
      { id: "sc-pineapple", url: "/gallery/brew-6.webp", title: "Pineapple Hibiscus", href: "/shop" },
    ],
    closingTitle: "Ready to brew?",
    closingText: "Make {brand} part of your daily ritual.",
    closingCtaLabel: "Shop now",
    closingCtaHref: "/shop",
  },
  about: {
    title: "About {brand}",
    intro:
      "We make hibiscus tea blends for everyday enjoyment, using roselle (Hibiscus sabdariffa), the flower behind Ghana's much-loved sobolo, paired with herbs and spices.",
    storyTitle: "Our story",
    story:
      "{brand} started with a simple idea: great-tasting hibiscus tea should be easy to find and easy to enjoy.\n\nWe blend dried roselle with ingredients like ginger, cloves, lemongrass, mint, cinnamon and prekese, then pack them in tea bags, pouches and gift tins.",
    missionTitle: "Our mission",
    mission:
      "To make a cup of hibiscus tea part of your day, brewed hot or iced, shared with friends or given as a gift.\n\nOur teas are food products, not medicines. If you are pregnant, breastfeeding, taking medication or managing a health condition, please speak to your doctor before drinking hibiscus tea.",
    images: [
      { id: "img-hibiscus", url: "/hibiscus.png", alt: "Dried hibiscus flowers" },
      { id: "img-tea", url: "/hibiscus 3.png", alt: "A cup of hibiscus tea" },
    ],
  },
  claims: {
    bannedPhrases: DEFAULT_BANNED_PHRASES,
    register: [],
  },
  ...ORDERING_DEFAULTS,
};

/**
 * Previous default texts of owner-editable templates, per section/key. A stored
 * value that equals one of these (ignoring whitespace/line endings) was never
 * customised, so it resolves to the current default instead of pinning the old one.
 */
const LEGACY_DEFAULTS: { [S in SettingsSection]?: Record<string, string[]> } = {
  whatsapp: {
    orderMessage: [
      "Hello {brand} 👋 I'd like to place an order.\nOrder: {orderNumber}\n{items}\nSubtotal: {subtotal}\nDelivery: {deliveryFee}\nTotal: {total}\n{fulfilment}\nPayment: {payment}\nGift: {gift}\nNote: {note}\nName: {name}\nOrder details: {link}\nInvoice (PDF): {invoiceLink}",
    ],
    riderDispatch: [
      "New delivery: {orderNumber}\nArea: {address}\nCustomer: {name}\nCollect: {amountDue}\nOpen this link when you arrive and enter the customer's code: {riderLink}",
    ],
  },
};

const normaliseText = (v: string) => v.replace(/\r\n?/g, "\n").replace(/\s+/g, " ").trim();

/** Swap untouched legacy template texts for the current defaults. */
function upgradeLegacy(section: SettingsSection, stored: Record<string, unknown>): Record<string, unknown> {
  const legacy = LEGACY_DEFAULTS[section];
  if (!legacy) return stored;
  const defaults = SETTINGS_DEFAULTS[section] as Record<string, unknown>;
  const next = { ...stored };
  for (const [key, olds] of Object.entries(legacy)) {
    const v = next[key];
    if (typeof v === "string" && olds.some((o) => normaliseText(o) === normaliseText(v))) next[key] = defaults[key];
  }
  return next;
}

/** Merge a stored value over defaults; fall back to defaults if it no longer validates. */
export function resolveSection<K extends SettingsSection>(
  section: K,
  stored: unknown,
): SettingsMap[K] {
  const defaults = SETTINGS_DEFAULTS[section];
  if (!stored || typeof stored !== "object") return defaults;
  const parsed = SETTINGS_SCHEMAS[section].safeParse({
    ...defaults,
    ...upgradeLegacy(section, stored as Record<string, unknown>),
  });
  if (!parsed.success) {
    console.warn(`[settings] stored "${section}" no longer validates; using defaults`, parsed.error.issues);
    return defaults;
  }
  return parsed.data as SettingsMap[K];
}
