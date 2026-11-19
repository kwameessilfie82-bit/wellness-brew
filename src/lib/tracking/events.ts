/** Event names shared by the browser tracker, /api/events and the KPI tracker. */
export const SITE_EVENTS = [
  "page_view",
  "view_item",
  "add_to_cart",
  "begin_checkout",
  "whatsapp_click",
  "order_placed",
  "generate_lead",
  "review_submitted",
  "tea_finder_complete",
  "hero_view",
  "hero_cta",
] as const;
export type SiteEventName = (typeof SITE_EVENTS)[number];

export function isSiteEvent(v: unknown): v is SiteEventName {
  return typeof v === "string" && (SITE_EVENTS as readonly string[]).includes(v);
}

/** GA4 recommended names (where one exists). */
export const GA4_NAMES: Partial<Record<SiteEventName, string>> = {
  view_item: "view_item",
  add_to_cart: "add_to_cart",
  begin_checkout: "begin_checkout",
  whatsapp_click: "contact",
  order_placed: "purchase",
  generate_lead: "generate_lead",
};

/** Meta standard events. */
export const META_NAMES: Partial<Record<SiteEventName, string>> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  whatsapp_click: "Contact",
  order_placed: "Purchase",
  generate_lead: "Lead",
};

/** Events stored first-party (feed the KPI tracker). page_view is left to GA4/Vercel Analytics. */
export const STORED_EVENTS: readonly SiteEventName[] = SITE_EVENTS.filter((e) => e !== "page_view");
