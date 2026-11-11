/** Input contract for placeOrder() — shared by the /order form and the server action. */
import { z } from "zod";

import { FULFILMENTS, PAYMENT_METHODS } from "./status";

const t = (max: number) => z.string().trim().max(max);

export const placeOrderSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1).max(64),
          quantity: z.number().int().min(1).max(10_000),
          /** Price the customer saw in the cart; used only to detect price changes. */
          seenPrice: z.number().min(0),
        }),
      )
      .min(1, "Your cart is empty")
      .max(100, "Too many different items in one order"),
    name: t(120).min(2, "Enter your name"),
    phone: t(30).min(7, "Enter your WhatsApp number"),
    email: t(200)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email")
      .optional()
      .default(""),
    /** Quick checkout sends only name + phone: delivery is arranged on WhatsApp. */
    fulfilment: z.enum(FULFILMENTS).optional().default("delivery"),
    zoneId: t(64).optional().default(""),
    /** Free-text area when the customer's area isn't in the zone list. */
    areaText: t(120).optional().default(""),
    address: t(500).optional().default(""),
    gpsAddress: t(20).optional().default(""),
    /** Map pin from the browser's geolocation ("Use my current location"). */
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        accuracy: z.number().min(0).max(1_000_000),
      })
      .nullable()
      .optional()
      .default(null),
    pickupLocationId: t(64).optional().default(""),
    deliveryWindow: t(80).optional().default(""),
    /** Agreed on WhatsApp when not given. */
    preferredPayment: z.enum(PAYMENT_METHODS).nullable().optional().default(null),
    note: t(500).optional().default(""),
    isGift: z.boolean().optional().default(false),
    recipientName: t(120).optional().default(""),
    recipientPhone: t(30).optional().default(""),
    giftMessage: t(300).optional().default(""),
    /** Sending the order on WhatsApp is the consent; kept optional for older clients. */
    consent: z.boolean().optional(),
    acceptPriceChanges: z.boolean().optional().default(false),
    allowDuplicate: z.boolean().optional().default(false),
    /** Honeypot: humans never see or fill this. */
    website: z.string().max(200).optional().default(""),
  })
  .superRefine((v, ctx) => {
    // Delivery details are optional: the customer shares their location on WhatsApp.
    if (v.fulfilment === "pickup" && !v.pickupLocationId) {
      ctx.addIssue({ code: "custom", path: ["pickupLocationId"], message: "Choose a pickup point" });
    }
    if (v.isGift && v.fulfilment === "delivery") {
      if (v.recipientName.length < 2) ctx.addIssue({ code: "custom", path: ["recipientName"], message: "Recipient's name" });
      if (v.recipientPhone.length < 7) ctx.addIssue({ code: "custom", path: ["recipientPhone"], message: "Recipient's phone" });
    }
  });

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;

export type PriceChange = { productId: string; name: string; was: number; now: number };
export type ItemProblem = { productId: string; name: string; problem: "unavailable" | "out_of_stock" | "too_many"; available?: number };

export type PlaceOrderResult =
  | { ok: true; token: string; orderNumber: string }
  | { ok: false; code: "validation"; error: string; fieldErrors: Record<string, string> }
  | { ok: false; code: "price_changed"; error: string; changes: PriceChange[] }
  | { ok: false; code: "items"; error: string; problems: ItemProblem[] }
  | { ok: false; code: "duplicate"; error: string; existingToken: string; existingNumber: string }
  | { ok: false; code: "paused" | "too_large" | "rate_limited" | "error"; error: string };
