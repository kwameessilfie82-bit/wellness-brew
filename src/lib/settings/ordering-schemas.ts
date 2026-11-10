/**
 * Settings for WhatsApp ordering: ordering rules, delivery zones and message
 * templates. Client-safe (no secrets). Wired into SettingsMap in ./schemas.ts.
 */
import { z } from "zod";

const str = (max = 500) => z.string().trim().max(max);
const id = z.string().trim().min(1).max(64);
const money = z.number().min(0).max(1_000_000);

// ── Ordering rules ───────────────────────────────────────────────────────
export const orderingSchema = z.object({
  acceptingOrders: z.boolean(),
  pausedMessage: str(500),
  expiryHours: z.number().int().min(1).max(720),
  maxQtyPerItem: z.number().int().min(1).max(10_000),
  /** 0 = no limit. Above this the customer is pointed to corporate / bulk orders. */
  maxOrderTotal: money,
  largeOrderMessage: str(500),
  momoEnabled: z.boolean(),
  bankEnabled: z.boolean(),
  codEnabled: z.boolean(),
  paymentNote: str(500),
  consentText: str(300).min(1, "Consent text is required"),
  handoffNote: str(500),
  deliveryWindows: z.array(z.object({ id, label: str(80).min(1, "Label is required") })).max(12),
});
export type OrderingSettings = z.infer<typeof orderingSchema>;

// ── Delivery ─────────────────────────────────────────────────────────────
export const deliverySchema = z.object({
  deliveryEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  zones: z
    .array(
      z.object({
        id,
        name: str(120).min(1, "Zone name is required"),
        areas: str(1000),
        /** null = fee confirmed on WhatsApp. */
        fee: money.nullable(),
        etaText: str(120),
        isActive: z.boolean(),
      }),
    )
    .max(100),
  allowUnlistedAreas: z.boolean(),
  /** null = never free. */
  freeDeliveryOver: money.nullable(),
  deliveryNote: str(500),
});
export type DeliverySettings = z.infer<typeof deliverySchema>;
export type DeliveryZone = DeliverySettings["zones"][number];

// ── WhatsApp message templates ───────────────────────────────────────────
export const WHATSAPP_TEMPLATE_KEYS = [
  "orderMessage",
  "nudge",
  "received",
  "paymentDetails",
  "confirmed",
  "readyForPickup",
  "outForDelivery",
  "riderDispatch",
  "delivered",
  "deliveryFailed",
  "cancelled",
  "paymentReceived",
] as const;
export type WhatsappTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export const whatsappSchema = z.object(
  Object.fromEntries(WHATSAPP_TEMPLATE_KEYS.map((k) => [k, str(2000)])) as Record<
    WhatsappTemplateKey,
    ReturnType<typeof str>
  >,
);
export type WhatsappSettings = z.infer<typeof whatsappSchema>;

export const WHATSAPP_TEMPLATE_INFO: Record<WhatsappTemplateKey, { label: string; hint: string }> = {
  orderMessage: {
    label: "Customer's order message",
    hint: "Prefilled when the customer taps “Send order on WhatsApp”. Keep {orderNumber} and {link}. Lines with an empty value (no gift, no note) are left out.",
  },
  nudge: { label: "Reminder: order not sent", hint: "For orders saved on the website but never sent on WhatsApp." },
  received: { label: "Got your order", hint: "First reply after the order arrives." },
  paymentDetails: { label: "Payment details", hint: "Sends MoMo / bank details from Settings → Payments." },
  confirmed: { label: "Order confirmed", hint: "" },
  readyForPickup: { label: "Ready for pickup", hint: "" },
  outForDelivery: { label: "Out for delivery", hint: "Includes the customer's delivery code." },
  riderDispatch: { label: "Message to rider", hint: "Sent to the rider with their delivery link." },
  delivered: { label: "Delivered — thank you", hint: "" },
  deliveryFailed: { label: "We couldn't reach you", hint: "" },
  cancelled: { label: "Order cancelled", hint: "" },
  paymentReceived: { label: "Payment received", hint: "" },
};

/** Placeholders available in every template (shown as help in the editor). */
export const TEMPLATE_PLACEHOLDERS = [
  "brand",
  "orderNumber",
  "name",
  "customer",
  "items",
  "subtotal",
  "deliveryFee",
  "total",
  "amountDue",
  "payment",
  "fulfilment",
  "fulfilmentBlock",
  "totalsBlock",
  "area",
  "street",
  "mapUrl",
  "address",
  "window",
  "gift",
  "giftFor",
  "note",
  "link",
  "invoiceLink",
  "code",
  "riderLink",
  "paymentDetails",
  "hours",
  "pickupLocation",
  "reason",
] as const;

export const ORDERING_DEFAULTS: {
  ordering: OrderingSettings;
  delivery: DeliverySettings;
  whatsapp: WhatsappSettings;
} = {
  ordering: {
    acceptingOrders: true,
    pausedMessage: "We're not taking new orders right now. Message us on WhatsApp and we'll help.",
    expiryHours: 48,
    maxQtyPerItem: 50,
    maxOrderTotal: 5000,
    largeOrderMessage:
      "For large or corporate orders, message us on WhatsApp and we'll put together a quote.",
    momoEnabled: true,
    bankEnabled: true,
    codEnabled: true,
    paymentNote: "You'll pay after we confirm your order on WhatsApp.",
    consentText: "I agree to be contacted on WhatsApp about this order.",
    handoffNote: "",
    deliveryWindows: [
      { id: "dw-morning", label: "Morning (8am–12pm)" },
      { id: "dw-afternoon", label: "Afternoon (12pm–4pm)" },
      { id: "dw-evening", label: "Evening (4pm–7pm)" },
    ],
  },
  delivery: {
    deliveryEnabled: true,
    pickupEnabled: true,
    zones: [],
    allowUnlistedAreas: true,
    freeDeliveryOver: null,
    deliveryNote: "",
  },
  whatsapp: {
    orderMessage: [
      "Hello {brand} 👋 I'd like to place an order.",
      "",
      "🧾 *ORDER {orderNumber}*",
      "👤 {customer}",
      "",
      "🛒 *ITEMS*",
      "{items}",
      "",
      "💰 *TOTAL*",
      "{totalsBlock}",
      "",
      "{fulfilmentBlock}",
      "",
      "🎁 Gift for: {giftFor}",
      "📝 Note: {note}",
      "",
      "📄 Invoice: {invoiceLink}",
      "🔗 Order: {link}",
    ].join("\n"),
    nudge:
      "Hi {name}, this is {brand}. We saw your order {orderNumber} on our website but didn't get it on WhatsApp. Would you like us to go ahead? {link}",
    received:
      "Hi {name}, thanks for your order {orderNumber}! We're checking stock and delivery and will confirm shortly.",
    paymentDetails:
      "Hi {name}, your order {orderNumber} comes to {amountDue}.\n\n{paymentDetails}\n\nPlease use {orderNumber} as the reference and send us a screenshot once paid. Your invoice: {invoiceLink}\n\nThank you!",
    confirmed:
      "Hi {name}, your order {orderNumber} is confirmed ✅ Total: {total}.\nInvoice (PDF): {invoiceLink}\nTrack it here: {link}",
    readyForPickup:
      "Hi {name}, your order {orderNumber} is ready for pickup at {pickupLocation}. See you soon!",
    outForDelivery:
      "Hi {name}, your order {orderNumber} is on the way 🚚 Please give the rider this delivery code: {code}. Track it here: {link}",
    riderDispatch: [
      "🚚 *DELIVERY {orderNumber}*",
      "",
      "💰 *Collect: {amountDue}*",
      "",
      "📍 *WHERE*",
      "Area: {area}",
      "Address: {street}",
      "Map: {mapUrl}",
      "",
      "👤 Customer: {name}",
      "",
      "🔗 Open this link on arrival and enter the customer's code:",
      "{riderLink}",
    ].join("\n"),
    delivered:
      "Hi {name}, your order {orderNumber} has been delivered. Enjoy your tea! We'd love to hear what you think 🌺",
    deliveryFailed:
      "Hi {name}, our rider couldn't reach you with order {orderNumber}. When is a good time to deliver?",
    cancelled: "Hi {name}, your order {orderNumber} has been cancelled. {reason}",
    paymentReceived: "Hi {name}, we've received your payment for {orderNumber}. Thank you! Your paid invoice: {invoiceLink}",
  },
};

/** The recommended layouts, used by the editor's "Use recommended layout" button. */
export const RECOMMENDED_TEMPLATES = {
  orderMessage: ORDERING_DEFAULTS.whatsapp.orderMessage,
  riderDispatch: ORDERING_DEFAULTS.whatsapp.riderDispatch,
} as const;
