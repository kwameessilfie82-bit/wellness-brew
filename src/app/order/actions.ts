"use server";

import { and, eq, gte, inArray } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { inventoryTable, orderEventTable, orderItemTable, productTable, storeOrderTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getProductThumbnail, parsePrice } from "@/lib/format";
import { round2 } from "@/lib/orders/money";
import { normalizePhone } from "@/lib/orders/phone";
import {
  type ItemProblem,
  placeOrderSchema,
  type PlaceOrderResult,
  type PriceChange,
} from "@/lib/orders/place-order-schema";
import { newDeliveryCode, newToken, nextOrderNumber } from "@/lib/orders/server/ids";
import { rateLimit } from "@/lib/orders/server/rate-limit";
import { getPublicSettings, getSettings } from "@/lib/settings/get";

const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

function itemsSignature(items: { productId: string; quantity: number }[]): string {
  return items
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join("|");
}

/**
 * Create a WhatsApp order from the cart. Everything is re-priced and
 * re-validated from the database; the client's prices are only compared to
 * detect changes. Idempotent on `idempotencyKey` (double taps, retries).
 * Stock is NOT reserved here — it's deducted when staff confirm.
 */
export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, code: "validation", error: "Please check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;
  if (input.website) return { ok: false, code: "error", error: "Something went wrong. Please try again." };

  try {
    // Idempotent replay: same key → same order, no further checks.
    const [replay] = await db
      .select({ token: storeOrderTable.publicToken, orderNumber: storeOrderTable.orderNumber })
      .from(storeOrderTable)
      .where(eq(storeOrderTable.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (replay?.token) return { ok: true, token: replay.token, orderNumber: replay.orderNumber };

    const [ordering, delivery, publicSettings] = await Promise.all([
      getSettings("ordering"),
      getSettings("delivery"),
      getPublicSettings(),
    ]);
    if (!ordering.acceptingOrders) return { ok: false, code: "paused", error: ordering.pausedMessage };

    const phone = normalizePhone(input.phone);
    if (!phone) {
      return {
        ok: false,
        code: "validation",
        error: "Please check the highlighted fields.",
        fieldErrors: { phone: "Enter a valid phone number, e.g. 054 123 4567" },
      };
    }
    const recipientPhone = input.isGift && input.recipientPhone ? normalizePhone(input.recipientPhone) : null;
    if (input.isGift && input.fulfilment === "delivery" && !recipientPhone) {
      return {
        ok: false,
        code: "validation",
        error: "Please check the highlighted fields.",
        fieldErrors: { recipientPhone: "Enter a valid phone number" },
      };
    }

    const ip = await clientIp();
    const [ipOk, phoneOk] = await Promise.all([
      // Counts attempts (incl. price-change retries), so leave headroom for real customers.
      // Unknown IP would be one shared bucket for everyone: rely on the phone limit instead.
      ip === "unknown" ? true : rateLimit(`order:ip:${ip}`, 30, 3600),
      rateLimit(`order:phone:${phone}`, 10, 3600),
    ]);
    if (!ipOk || !phoneOk) {
      return {
        ok: false,
        code: "rate_limited",
        error: "Too many orders in a short time. Please message us on WhatsApp instead.",
      };
    }

    if (input.fulfilment === "delivery" && !delivery.deliveryEnabled) {
      return { ok: false, code: "validation", error: "Delivery isn't available right now.", fieldErrors: { fulfilment: "Choose pickup" } };
    }
    if (input.fulfilment === "pickup" && !delivery.pickupEnabled) {
      return { ok: false, code: "validation", error: "Pickup isn't available right now.", fieldErrors: { fulfilment: "Choose delivery" } };
    }

    // ── Price + stock from the DB ───────────────────────────────────────
    const requested = new Map<string, { quantity: number; seenPrice: number }>();
    for (const i of input.items) {
      const prev = requested.get(i.productId);
      requested.set(i.productId, { quantity: (prev?.quantity ?? 0) + i.quantity, seenPrice: i.seenPrice });
    }
    const ids = [...requested.keys()];
    const products = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        sku: productTable.sku,
        price: productTable.price,
        images: productTable.images,
        isActive: productTable.isActive,
        available: inventoryTable.quantityAvailable,
      })
      .from(productTable)
      .leftJoin(inventoryTable, eq(inventoryTable.productId, productTable.id))
      .where(inArray(productTable.id, ids));
    const byId = new Map(products.map((p) => [p.id, p]));

    const problems: ItemProblem[] = [];
    const changes: PriceChange[] = [];
    const lines: { productId: string; name: string; sku: string; price: number; quantity: number; image: string }[] = [];
    for (const [productId, req] of requested) {
      const p = byId.get(productId);
      if (!p || !p.isActive) {
        problems.push({ productId, name: p?.name.trim() ?? "An item", problem: "unavailable" });
        continue;
      }
      const name = p.name.trim();
      if (req.quantity > ordering.maxQtyPerItem) {
        problems.push({ productId, name, problem: "too_many", available: ordering.maxQtyPerItem });
        continue;
      }
      // No inventory row = stock not tracked for this product.
      if (p.available !== null && p.available < req.quantity) {
        problems.push({ productId, name, problem: "out_of_stock", available: Math.max(0, p.available) });
        continue;
      }
      const price = parsePrice(p.price);
      if (Math.abs(price - req.seenPrice) >= 0.005) changes.push({ productId, name, was: req.seenPrice, now: price });
      lines.push({ productId, name, sku: p.sku, price, quantity: req.quantity, image: getProductThumbnail(p.images) });
    }
    if (problems.length > 0) {
      return { ok: false, code: "items", error: "Some items in your cart need attention.", problems };
    }
    if (changes.length > 0 && !input.acceptPriceChanges) {
      return { ok: false, code: "price_changed", error: "Some prices have changed since you added them.", changes };
    }

    const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
    if (subtotal <= 0) return { ok: false, code: "error", error: "Your order total is zero." };
    if (ordering.maxOrderTotal > 0 && subtotal > ordering.maxOrderTotal) {
      return { ok: false, code: "too_large", error: ordering.largeOrderMessage };
    }

    // ── Fulfilment ───────────────────────────────────────────────────────
    let deliveryFee = 0;
    let feeConfirmed = true;
    let deliveryZoneId: string | null = null;
    let deliveryArea: string | null = null;
    let pickupLocationId: string | null = null;
    let pickupLocationName: string | null = null;
    if (input.fulfilment === "delivery") {
      const zone = input.zoneId ? delivery.zones.find((z) => z.id === input.zoneId && z.isActive) : undefined;
      if (zone) {
        deliveryZoneId = zone.id;
        deliveryArea = zone.name;
        if (zone.fee === null) feeConfirmed = false;
        else deliveryFee = zone.fee;
      } else if (input.areaText && delivery.allowUnlistedAreas) {
        deliveryArea = input.areaText;
        feeConfirmed = false;
      } else {
        return {
          ok: false,
          code: "validation",
          error: "Please check the highlighted fields.",
          fieldErrors: { zoneId: "Choose your area from the list" },
        };
      }
      if (delivery.freeDeliveryOver !== null && subtotal >= delivery.freeDeliveryOver) {
        deliveryFee = 0;
        feeConfirmed = true;
      }
    } else {
      const loc = publicSettings.locations.items.find(
        (l) => l.id === input.pickupLocationId && l.isPublic && l.type === "pickup",
      );
      if (!loc) {
        return {
          ok: false,
          code: "validation",
          error: "Please check the highlighted fields.",
          fieldErrors: { pickupLocationId: "Choose a pickup point" },
        };
      }
      pickupLocationId = loc.id;
      pickupLocationName = loc.name;
    }
    const preferredOk =
      (input.preferredPayment === "momo" && ordering.momoEnabled) ||
      (input.preferredPayment === "bank" && ordering.bankEnabled) ||
      (input.preferredPayment === "cash_on_delivery" && ordering.codEnabled);
    if (!preferredOk) {
      return {
        ok: false,
        code: "validation",
        error: "Please check the highlighted fields.",
        fieldErrors: { preferredPayment: "Choose another payment option" },
      };
    }
    const deliveryWindow = ordering.deliveryWindows.find((w) => w.id === input.deliveryWindow)?.label ?? null;

    // ── Duplicate guard: same phone + same items in the last 10 minutes ──
    if (!input.allowDuplicate) {
      const recent = await db
        .select({ id: storeOrderTable.id, token: storeOrderTable.publicToken, orderNumber: storeOrderTable.orderNumber })
        .from(storeOrderTable)
        .where(
          and(
            eq(storeOrderTable.customerPhoneE164, phone),
            inArray(storeOrderTable.status, ["awaiting_customer", "received"]),
            gte(storeOrderTable.createdAt, new Date(Date.now() - DUPLICATE_WINDOW_MS)),
          ),
        )
        .limit(5);
      if (recent.length > 0) {
        const recentItems = await db
          .select({ orderId: orderItemTable.orderId, productId: orderItemTable.productId, quantity: orderItemTable.quantity })
          .from(orderItemTable)
          .where(inArray(orderItemTable.orderId, recent.map((r) => r.id)));
        const sig = itemsSignature(lines);
        const dup = recent.find(
          (r) =>
            itemsSignature(
              recentItems
                .filter((i) => i.orderId === r.id)
                .map((i) => ({ productId: i.productId ?? "", quantity: i.quantity })),
            ) === sig,
        );
        if (dup?.token) {
          return {
            ok: false,
            code: "duplicate",
            error: `You placed this same order a few minutes ago (${dup.orderNumber}).`,
            existingToken: dup.token,
            existingNumber: dup.orderNumber,
          };
        }
      }
    }

    // ── Create ───────────────────────────────────────────────────────────
    const user = await getCurrentUser().catch(() => null);
    const now = new Date();
    const orderId = crypto.randomUUID();
    const token = newToken();
    const total = round2(subtotal + deliveryFee);

    try {
      const orderNumber = await db.transaction(async (tx) => {
        const number = await nextOrderNumber(tx, now);
        await tx.insert(storeOrderTable).values({
          id: orderId,
          orderNumber: number,
          publicToken: token,
          channel: "whatsapp",
          userId: user?.id ?? null,
          status: "awaiting_customer",
          customerEmail: input.email || user?.email || null,
          customerName: input.name,
          customerPhone: input.phone,
          customerPhoneE164: phone,
          fulfilment: input.fulfilment,
          shippingAddress: input.fulfilment === "delivery" ? input.address : null,
          shippingMethod: input.fulfilment,
          deliveryZoneId,
          deliveryArea,
          gpsAddress: input.gpsAddress || null,
          deliveryFeeConfirmed: feeConfirmed,
          pickupLocationId,
          pickupLocationName,
          deliveryWindow,
          isGift: input.isGift,
          recipientName: input.isGift ? input.recipientName || null : null,
          recipientPhone: recipientPhone,
          giftMessage: input.isGift ? input.giftMessage || null : null,
          preferredPayment: input.preferredPayment,
          paymentStatus: "unpaid",
          subtotal: subtotal.toFixed(2),
          shipping: deliveryFee.toFixed(2),
          tax: "0",
          total: total.toFixed(2),
          notes: input.note || null,
          deliveryCode: newDeliveryCode(),
          expiresAt: new Date(now.getTime() + ordering.expiryHours * 3600 * 1000),
          idempotencyKey: input.idempotencyKey,
          createdAt: now,
          updatedAt: now,
        });
        await tx.insert(orderItemTable).values(
          lines.map((l) => ({
            id: crypto.randomUUID(),
            orderId,
            productId: l.productId,
            productName: l.name,
            sku: l.sku,
            price: l.price.toFixed(2),
            quantity: l.quantity,
            image: l.image || null,
          })),
        );
        await tx.insert(orderEventTable).values({
          id: crypto.randomUUID(),
          orderId,
          type: "created",
          toStatus: "awaiting_customer",
          actorType: "customer",
          customerVisible: true,
          data: { priceChangesAccepted: changes.length > 0 ? changes : undefined, ip },
          createdAt: now,
        });
        return number;
      });
      return { ok: true, token, orderNumber };
    } catch (error) {
      // Concurrent duplicate submit with the same key: return the winner.
      if ((error as { code?: string })?.code === "23505" || String(error).includes("idempotency")) {
        const [existing] = await db
          .select({ token: storeOrderTable.publicToken, orderNumber: storeOrderTable.orderNumber })
          .from(storeOrderTable)
          .where(eq(storeOrderTable.idempotencyKey, input.idempotencyKey))
          .limit(1);
        if (existing?.token) return { ok: true, token: existing.token, orderNumber: existing.orderNumber };
      }
      throw error;
    }
  } catch (error) {
    console.error("[placeOrder] failed:", error);
    return { ok: false, code: "error", error: "We couldn't save your order. Please try again or message us on WhatsApp." };
  }
}
