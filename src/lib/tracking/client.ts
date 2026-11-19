"use client";

import { GA4_NAMES, META_NAMES, STORED_EVENTS, type SiteEventName } from "./events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type TrackParams = {
  productId?: string;
  productName?: string;
  value?: number;
  currency?: string;
  variant?: string;
  /** Extra GA4 params. */
  [key: string]: unknown;
};

const UTM_KEY = "wb-utm";
const REF_KEY = "wb-ref";

/** Referral code from a ?ref=CODE link, remembered for the visit. */
export function readReferral(): string | null {
  try {
    return sessionStorage.getItem(REF_KEY);
  } catch {
    return null;
  }
}
type Utm = { source?: string; medium?: string; campaign?: string };

/** Remember the campaign that brought this visitor (per tab session). */
export function captureUtm(): void {
  try {
    const p = new URLSearchParams(window.location.search);
    const ref = p.get("ref");
    if (ref && /^[A-Za-z0-9_-]{2,40}$/.test(ref)) sessionStorage.setItem(REF_KEY, ref.toUpperCase());
    const source = p.get("utm_source");
    if (!source) return;
    const utm: Utm = {
      source: source.slice(0, 60),
      medium: p.get("utm_medium")?.slice(0, 60) ?? undefined,
      campaign: p.get("utm_campaign")?.slice(0, 80) ?? undefined,
    };
    sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  } catch {
    /* storage blocked */
  }
}

function readUtm(): Utm {
  try {
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || "{}") as Utm;
  } catch {
    return {};
  }
}

/**
 * Send one event to GA4 + Meta Pixel (if loaded) and to our own /api/events
 * (which also forwards to Meta CAPI with the same event id for de-duplication).
 * Never throws.
 */
export function track(name: SiteEventName, params: TrackParams = {}): void {
  try {
    const eventId = crypto.randomUUID();
    const { productId, productName, value, currency = "GHS", variant, ...rest } = params;
    const ga = GA4_NAMES[name] ?? name;
    window.gtag?.("event", ga, {
      ...rest,
      ...(value !== undefined ? { value, currency } : {}),
      ...(productId ? { items: [{ item_id: productId, item_name: productName, price: value }] } : {}),
    });
    const meta = META_NAMES[name];
    if (meta) {
      window.fbq?.(
        "track",
        meta,
        {
          ...(value !== undefined ? { value, currency } : {}),
          ...(productId ? { content_ids: [productId], content_type: "product", content_name: productName } : {}),
        },
        { eventID: eventId },
      );
    }
    if (!STORED_EVENTS.includes(name)) return;
    const body = JSON.stringify({
      name,
      eventId,
      path: window.location.pathname,
      productId,
      value,
      variant,
      utm: readUtm(),
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {
    /* tracking must never break the page */
  }
}
