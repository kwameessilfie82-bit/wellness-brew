import type { StoreProduct } from "@/lib/products/normalize";
import { brandLogos, type PublicSettings } from "@/lib/settings/schemas";

import { absoluteImage, absoluteUrl, SITE_URL } from "./site";

type Json = Record<string, unknown>;

/** Renders schema.org JSON-LD. `<` is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}
    />
  );
}

const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

function parseAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return {
    "@type": "PostalAddress",
    streetAddress: parts.slice(0, Math.max(1, parts.length - 1)).join(", ") || address,
    addressLocality: parts.length > 1 ? parts[parts.length - 1] : "Accra",
    addressRegion: "Greater Accra",
    addressCountry: "GH",
  };
}

function e164(phone: string): string | undefined {
  let digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("0")) digits = `233${digits.slice(1)}`;
  return `+${digits}`;
}

export function organizationLd(settings: PublicSettings): Json {
  const { brand, contact, locations, social } = settings;
  const main = locations.items.find((l) => l.isPublic && l.address) ?? null;
  const sameAs = social.items.map((s) => s.url).filter((u) => /^https?:\/\//i.test(u));
  const email = contact.emailOrders || contact.emailHello || undefined;
  const telephone = e164(contact.orderPhone || contact.whatsappNumber);
  return {
    "@context": "https://schema.org",
    "@type": ["OnlineStore", "LocalBusiness"],
    "@id": ORG_ID,
    name: brand.name,
    ...(brand.legalName ? { legalName: brand.legalName } : {}),
    url: SITE_URL,
    logo: absoluteUrl(brandLogos(brand).light),
    image: absoluteUrl(brandLogos(brand).light),
    description: brand.description,
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(main ? { address: parseAddress(main.address) } : {}),
    ...(main?.hours || contact.businessHours ? { openingHours: main?.hours || contact.businessHours } : {}),
    areaServed: { "@type": "Country", name: "Ghana" },
    currenciesAccepted: "GHS",
    priceRange: "GHS",
    ...(sameAs.length ? { sameAs } : {}),
    ...(telephone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            telephone,
            contactType: "customer service",
            areaServed: "GH",
            availableLanguage: ["en"],
          },
        }
      : {}),
  };
}

export function websiteLd(brandName: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: SITE_URL,
    name: brandName,
    inLanguage: "en-GH",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/shop?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productPath(p: Pick<StoreProduct, "slug" | "id">): string {
  return `/shop/${encodeURIComponent(p.slug || p.id)}`;
}

/**
 * Delivery and returns facts for merchant-listing structured data. Delivery is
 * agreed on WhatsApp, so the rate is only published as a range when priced
 * delivery zones exist in Settings → Delivery. Returns mirror the Terms page
 * (§6: unopened products within 30 days).
 */
const HANDLING_DAYS = { min: 0, max: 1 };
const TRANSIT_DAYS = { min: 0, max: 2 };
const RETURN_DAYS = 30;

export type ShippingFacts = { zoneFees: (number | null)[] };

function shippingDetailsLd(shipping?: ShippingFacts): Json {
  const fees = (shipping?.zoneFees ?? []).filter((f): f is number => typeof f === "number" && f >= 0);
  const rate: Json | null = fees.length
    ? {
        "@type": "MonetaryAmount",
        currency: "GHS",
        ...(Math.min(...fees) === Math.max(...fees)
          ? { value: Math.min(...fees).toFixed(2) }
          : { minValue: Math.min(...fees).toFixed(2), maxValue: Math.max(...fees).toFixed(2) }),
      }
    : null;
  return {
    "@type": "OfferShippingDetails",
    ...(rate ? { shippingRate: rate } : {}),
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "GH" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: HANDLING_DAYS.min, maxValue: HANDLING_DAYS.max, unitCode: "DAY" },
      transitTime: { "@type": "QuantitativeValue", minValue: TRANSIT_DAYS.min, maxValue: TRANSIT_DAYS.max, unitCode: "DAY" },
    },
  };
}

const RETURN_POLICY_LD: Json = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "GH",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: RETURN_DAYS,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnFeesCustomerResponsibility",
  merchantReturnLink: absoluteUrl("/terms"),
};

export function productLd(
  product: StoreProduct & { updatedAt?: Date | null },
  brandName: string,
  shipping?: ShippingFacts,
): Json {
  const url = absoluteUrl(productPath(product));
  const images = product.images.map((i) => absoluteImage(i)).filter(Boolean) as string[];
  const image = images.length ? images : [absoluteImage(product.image)].filter(Boolean);
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  // The current price has applied since the product was last edited.
  const validFrom = (product.updatedAt ?? new Date()).toISOString();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: product.description || product.shortDescription || undefined,
    ...(image.length ? { image } : {}),
    sku: product.sku || undefined,
    brand: { "@type": "Brand", name: product.manufacturer || brandName },
    ...(product.categoryName ? { category: product.categoryName } : {}),
    url,
    offers: {
      "@type": "Offer",
      url,
      price: product.price.toFixed(2),
      priceCurrency: "GHS",
      validFrom,
      priceValidUntil: nextYear.toISOString().slice(0, 10),
      availability:
        product.quantityAvailable > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: shippingDetailsLd(shipping),
      hasMerchantReturnPolicy: RETURN_POLICY_LD,
      seller: { "@id": ORG_ID },
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListLd(products: StoreProduct[], name: string): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(productPath(p)),
      name: p.name,
    })),
  };
}
