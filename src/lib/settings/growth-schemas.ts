/**
 * Settings sections for roadmap stages 3–8: SEO, tracking, legal/help pages,
 * site toggles, taxonomy, gifting, Tea Finder, stockists, experiments.
 * Client-safe (no secrets: the Meta CAPI token lives only in env).
 */
import { z } from "zod";

const str = (max = 500) => z.string().trim().max(max);
const id = z.string().trim().min(1).max(64);
const optionalUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => v === "" || /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), {
    message: "Must be a full https:// link or a /path",
  });
const isoDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { message: "Use YYYY-MM-DD" });
const phone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => v === "" || /^\+?[0-9 ()-]{7,}$/.test(v), { message: "Use digits, spaces and an optional leading +" });

// ── SEO ───────────────────────────────────────────────────────────────────
export const seoSchema = z.object({
  defaultTitle: str(70),
  defaultDescription: str(170),
  ogImageUrl: optionalUrl,
  keywords: str(500),
});
export type SeoSettings = z.infer<typeof seoSchema>;

// ── Tracking ──────────────────────────────────────────────────────────────
export const trackingSchema = z.object({
  ga4Id: str(20).refine((v) => v === "" || /^G-[A-Z0-9]{4,}$/i.test(v), { message: "Looks like G-XXXXXXXXXX" }),
  metaPixelId: str(20).refine((v) => v === "" || /^\d{6,20}$/.test(v), { message: "Digits only" }),
  utmPresets: z
    .array(
      z.object({
        id,
        label: str(60).min(1, "Label is required"),
        source: str(60).min(1, "Source is required"),
        medium: str(60).min(1, "Medium is required"),
        campaign: str(80),
      }),
    )
    .max(30),
});
export type TrackingSettings = z.infer<typeof trackingSchema>;

// ── Pages (Markdown) ──────────────────────────────────────────────────────
const page = z.object({
  title: str(120).min(1, "Title is required"),
  body: str(30000),
  updatedOn: isoDate,
});
export type PageContent = z.infer<typeof page>;
export const PAGE_KEYS = ["terms", "privacy", "delivery", "returns"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];
export const pagesSchema = z.object({
  terms: page,
  privacy: page,
  delivery: page,
  returns: page,
  faq: z.object({
    title: str(120).min(1, "Title is required"),
    intro: str(1000),
    items: z
      .array(z.object({ id, question: str(300).min(1, "Question is required"), answer: str(3000) }))
      .max(100),
  }),
});
export type PagesSettings = z.infer<typeof pagesSchema>;

// ── Site toggles ──────────────────────────────────────────────────────────
export const HOMEPAGE_SECTION_KEYS = ["valueProps", "featured", "showcase", "reviews", "journal", "closing"] as const;
export const siteSchema = z.object({
  announcement: z.object({
    enabled: z.boolean(),
    text: str(200),
    linkLabel: str(40),
    href: optionalUrl,
    startsOn: isoDate,
    endsOn: isoDate,
  }),
  maintenance: z.object({ enabled: z.boolean(), title: str(120), message: str(500) }),
  homepageSections: z.object(
    Object.fromEntries(HOMEPAGE_SECTION_KEYS.map((k) => [k, z.boolean()])) as Record<
      (typeof HOMEPAGE_SECTION_KEYS)[number],
      z.ZodBoolean
    >,
  ),
});
export type SiteSettings = z.infer<typeof siteSchema>;

// ── Taxonomy ──────────────────────────────────────────────────────────────
const term = z.object({ id, label: str(60).min(1, "Label is required") });
export const TAXONOMY_GROUPS = ["flavours", "formats", "occasions"] as const;
export type TaxonomyGroup = (typeof TAXONOMY_GROUPS)[number];
export const taxonomySchema = z.object({
  flavours: z.array(term).max(60),
  formats: z.array(term).max(30),
  occasions: z.array(term).max(30),
});
export type TaxonomySettings = z.infer<typeof taxonomySchema>;

// ── Corporate gifting ─────────────────────────────────────────────────────
export const giftingSchema = z.object({
  enabled: z.boolean(),
  title: str(120).min(1, "Title is required"),
  intro: str(1500),
  heroImageUrl: optionalUrl,
  tiers: z
    .array(
      z.object({
        id,
        name: str(80).min(1, "Name is required"),
        contents: str(1000),
        price: z.number().min(0).max(1_000_000).nullable(),
        minQty: z.number().int().min(1).max(100_000),
        leadTime: str(80),
        branding: str(300),
        imageUrl: optionalUrl,
      }),
    )
    .max(12),
  formTitle: str(120),
  successMessage: str(300),
});
export type GiftingSettings = z.infer<typeof giftingSchema>;

// ── Tea Finder ────────────────────────────────────────────────────────────
export const teaFinderSchema = z.object({
  enabled: z.boolean(),
  title: str(120).min(1, "Title is required"),
  intro: str(500),
  questions: z
    .array(
      z.object({
        id,
        question: str(200).min(1, "Question is required"),
        answers: z
          .array(
            z.object({
              id,
              label: str(80).min(1, "Answer is required"),
              /** Taxonomy term ids this answer points to. */
              terms: z.array(id).max(20),
            }),
          )
          .min(2, "Add at least two answers")
          .max(8),
      }),
    )
    .max(8),
  resultTitle: str(120),
});
export type TeaFinderSettings = z.infer<typeof teaFinderSchema>;

// ── Stockists ─────────────────────────────────────────────────────────────
export const stockistsSchema = z.object({
  enabled: z.boolean(),
  title: str(120).min(1, "Title is required"),
  intro: str(1000),
  items: z
    .array(
      z.object({
        id,
        name: str(120).min(1, "Name is required"),
        area: str(80),
        address: str(300),
        mapUrl: optionalUrl,
        phone,
        url: optionalUrl,
        isPublic: z.boolean(),
      }),
    )
    .max(200),
  partnerTitle: str(120),
  partnerIntro: str(1000),
});
export type StockistsSettings = z.infer<typeof stockistsSchema>;

// ── Experiments (A/B) ─────────────────────────────────────────────────────
export const experimentsSchema = z.object({
  hero: z.object({
    enabled: z.boolean(),
    /** Share of visitors who see variant B, 0–100. */
    splitPercent: z.number().int().min(0).max(100),
    titleLead: str(120),
    titleHighlight: str(120),
    primaryCtaLabel: str(40),
  }),
});
export type ExperimentsSettings = z.infer<typeof experimentsSchema>;

// ── Defaults ──────────────────────────────────────────────────────────────
const UPDATED = "2026-11-19";

export const GROWTH_DEFAULTS: {
  seo: SeoSettings;
  tracking: TrackingSettings;
  pages: PagesSettings;
  site: SiteSettings;
  taxonomy: TaxonomySettings;
  gifting: GiftingSettings;
  teaFinder: TeaFinderSettings;
  stockists: StockistsSettings;
  experiments: ExperimentsSettings;
} = {
  seo: { defaultTitle: "", defaultDescription: "", ogImageUrl: "", keywords: "" },
  tracking: {
    ga4Id: "",
    metaPixelId: "",
    utmPresets: [
      { id: "utm-ig-bio", label: "Instagram bio", source: "instagram", medium: "social", campaign: "bio" },
      { id: "utm-wa-status", label: "WhatsApp status", source: "whatsapp", medium: "status", campaign: "" },
      { id: "utm-fb-post", label: "Facebook post", source: "facebook", medium: "social", campaign: "" },
      { id: "utm-li-post", label: "LinkedIn post", source: "linkedin", medium: "social", campaign: "corporate" },
    ],
  },
  pages: {
    terms: {
      title: "Terms of Service",
      updatedOn: UPDATED,
      body: `By using the {brand} website or placing an order with us, you agree to these terms.

## Orders
- You build your order on the website and send it to us on WhatsApp. An order is only accepted once we confirm it on WhatsApp.
- We may decline or cancel an order, for example if an item is out of stock or a price was shown in error. If you have paid, we refund you in full.
- Unconfirmed orders expire automatically after a short time.

## Prices and payment
- All prices are in Ghana Cedis (GHS). Delivery fees are shown at checkout or agreed on WhatsApp.
- We accept the payment options shown at checkout. Your order is prepared once payment is confirmed, unless you chose cash on delivery.
- Discount and referral codes cannot be exchanged for cash and may have limits shown when you use them.

## Delivery and pickup
See our [Delivery](/delivery) and [Returns](/returns) pages.

## Our products
Our teas are food products. They are not intended to diagnose, treat, cure or prevent any disease. If you are pregnant, breastfeeding, taking medication or managing a health condition, speak to your doctor before use.

## Website content
Photos and text on this site belong to {brand}. Please don't reuse them without permission.

## Contact
Questions about these terms? [Contact us](/contact).`,
    },
    privacy: {
      title: "Privacy Policy",
      updatedOn: UPDATED,
      body: `This policy explains what personal information {brand} collects and how we use it.

## What we collect
- **Order details:** your name, phone number, delivery area or address, optional location pin and email, and what you ordered.
- **Account details:** if you create an account, your name and email.
- **Reviews and enquiries:** what you choose to send us.
- **Usage data:** anonymous page and click statistics. If analytics tools are switched on, Google Analytics and Meta may set cookies.

## How we use it
- To confirm, deliver and support your orders.
- To reply to your enquiries.
- To improve the website and our products.

We never sell your information.

## Who we share it with
- Delivery riders get only what they need to deliver your order.
- Service providers that host this website and our database.

## Keeping it safe
Your information is stored on secure, access-controlled systems. Only staff who need it can see it.

## Your rights
You can ask us to show, correct or delete your information at any time. [Contact us](/contact).`,
    },
    delivery: {
      title: "Delivery & Pickup",
      updatedOn: UPDATED,
      body: `## How delivery works
1. Send your order to us on WhatsApp from the website.
2. We confirm the order, the delivery fee and the time.
3. A rider brings your order. Give the rider the delivery code from your order page.

## Delivery areas and fees
Fees depend on your area and are shown at checkout when your area is listed. Otherwise we agree the fee on WhatsApp before you pay.

## Pickup
Choose pickup at checkout and we'll tell you on WhatsApp when your order is ready.

## Gifts
Tick "This is a gift" at checkout and we'll deliver to the recipient with your message.`,
    },
    returns: {
      title: "Returns & Refunds",
      updatedOn: UPDATED,
      body: `We want you to love every cup.

## Damaged or wrong items
If your order arrives damaged, or you received the wrong item, message us on WhatsApp within **48 hours** with a photo. We'll replace the item or refund you.

## Change of mind
Because our teas are food products, we can't take back opened packs. Unopened packs can be returned within 7 days; you cover the return delivery.

## Refunds
Refunds go back to the payment method you used, usually within 3 working days of approval.`,
    },
    faq: {
      title: "Frequently asked questions",
      intro: "Can't find your answer? Message us on WhatsApp.",
      items: [
        {
          id: "faq-order",
          question: "How do I order?",
          answer: "Add teas to your cart, tap Checkout, then send the order to us on WhatsApp. We confirm it there.",
        },
        {
          id: "faq-pay",
          question: "How do I pay?",
          answer: "Mobile Money, bank transfer or cash on delivery, depending on what's available at checkout.",
        },
        {
          id: "faq-brew",
          question: "How do I brew hibiscus tea?",
          answer: "Steep one bag in freshly boiled water for 5–7 minutes. For iced tea, brew double strength and pour over ice.",
        },
        {
          id: "faq-caffeine",
          question: "Does hibiscus tea contain caffeine?",
          answer: "Hibiscus is naturally caffeine-free. Check each blend's ingredients for anything added.",
        },
        {
          id: "faq-health",
          question: "Is it safe for everyone?",
          answer: "Our teas are food products. If you are pregnant, breastfeeding, taking medication or managing a health condition, speak to your doctor first.",
        },
      ],
    },
  },
  site: {
    announcement: { enabled: false, text: "", linkLabel: "", href: "", startsOn: "", endsOn: "" },
    maintenance: {
      enabled: false,
      title: "We'll be right back",
      message: "We're making a few improvements. You can still order on WhatsApp.",
    },
    homepageSections: { valueProps: true, featured: true, showcase: true, reviews: true, journal: true, closing: true },
  },
  taxonomy: {
    flavours: [
      { id: "fl-spiced", label: "Spiced" },
      { id: "fl-fruity", label: "Fruity" },
      { id: "fl-citrus", label: "Citrus" },
      { id: "fl-herbal", label: "Herbal" },
      { id: "fl-floral", label: "Floral" },
    ],
    formats: [
      { id: "fm-bags", label: "Tea bags" },
      { id: "fm-loose", label: "Loose leaf" },
      { id: "fm-gift", label: "Gift tin" },
    ],
    occasions: [
      { id: "oc-morning", label: "Morning" },
      { id: "oc-evening", label: "Evening wind-down" },
      { id: "oc-iced", label: "Iced & refreshing" },
      { id: "oc-gift", label: "Gifting" },
    ],
  },
  gifting: {
    enabled: true,
    title: "Corporate & event gifting",
    intro:
      "Thoughtful hibiscus tea gifts for teams, clients and events. Tell us what you need and we'll send a quote on WhatsApp or email.",
    heroImageUrl: "",
    tiers: [],
    formTitle: "Request a quote",
    successMessage: "Thank you! We'll get back to you within one working day.",
  },
  teaFinder: {
    enabled: true,
    title: "Find your blend",
    intro: "Answer three quick questions and we'll suggest a tea.",
    questions: [
      {
        id: "q-taste",
        question: "Which flavours do you enjoy?",
        answers: [
          { id: "a-spiced", label: "Warm & spiced", terms: ["fl-spiced"] },
          { id: "a-fruity", label: "Sweet & fruity", terms: ["fl-fruity", "fl-citrus"] },
          { id: "a-herbal", label: "Fresh & herbal", terms: ["fl-herbal", "fl-floral"] },
        ],
      },
      {
        id: "q-when",
        question: "When will you drink it?",
        answers: [
          { id: "a-morning", label: "Morning", terms: ["oc-morning"] },
          { id: "a-evening", label: "Evening", terms: ["oc-evening"] },
          { id: "a-iced", label: "Iced, on a hot day", terms: ["oc-iced"] },
        ],
      },
      {
        id: "q-for",
        question: "Who is it for?",
        answers: [
          { id: "a-me", label: "Me", terms: ["fm-bags"] },
          { id: "a-gift", label: "A gift", terms: ["oc-gift", "fm-gift"] },
        ],
      },
    ],
    resultTitle: "Your matches",
  },
  stockists: {
    enabled: true,
    title: "Where to buy",
    intro: "Find {brand} teas at these shops, or order online for delivery.",
    items: [],
    partnerTitle: "Stock our teas",
    partnerIntro: "Run a shop, café, pharmacy or hotel? Tell us about it and we'll send wholesale prices.",
  },
  experiments: {
    hero: { enabled: false, splitPercent: 50, titleLead: "", titleHighlight: "", primaryCtaLabel: "" },
  },
};
