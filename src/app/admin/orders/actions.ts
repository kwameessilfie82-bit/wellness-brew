"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { inventoryTable, orderItemTable, productTable, storeOrderTable } from "@/db/schema";
import { hasPermission, isAdmin } from "@/lib/admin-auth";
import { parsePrice } from "@/lib/format";
import { waLink } from "@/lib/orders/message";
import { round2 } from "@/lib/orders/money";
import { newToken } from "@/lib/orders/server/ids";
import { syncOrderInvoice } from "@/lib/orders/server/invoices";
import { listOrders, listStaff, type OrderTab, ORDER_TABS } from "@/lib/orders/server/staff-queries";
import { addEvent, lockOrder, StockShortError, transitionLocked } from "@/lib/orders/server/transitions";
import { orderLink, paymentDetailsText, siteUrl, staffMessage } from "@/lib/orders/server/view";
import {
  CANCEL_REASON_LABELS,
  CANCEL_REASONS,
  type CancelReason,
  deriveCompletion,
  EDITABLE,
  isOrderStatus,
  type OrderStatus,
  PAYMENT_METHODS,
  type PaymentMethod,
  TERMINAL,
} from "@/lib/orders/status";
import type { WhatsappTemplateKey } from "@/lib/settings/ordering-schemas";
import { WHATSAPP_TEMPLATE_KEYS } from "@/lib/settings/ordering-schemas";
import { getSettings } from "@/lib/settings/get";

type Ok<T = object> = { ok: true } & T;
type Fail = { ok: false; error: string; code?: string };
type Result<T = object> = Ok<T> | Fail;

const RIDER_LINK_TTL_MS = 7 * 24 * 3600 * 1000;

async function requireStaff() {
  const admin = await isAdmin();
  if (!admin || !hasPermission(admin, "canManageOrders")) return null;
  return admin;
}

function refresh(orderId?: string) {
  revalidatePath("/admin/orders");
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

const CONFLICT: Fail = { ok: false, code: "conflict", error: "This order was changed by someone else. Refresh and try again." };

/* ───────────── list (for "load more" / search from the client) ───────────── */

export async function fetchOrders(tab: string, q: string, cursor: string | null) {
  if (!(await requireStaff())) return { rows: [], nextCursor: null };
  const t = (ORDER_TABS as readonly string[]).includes(tab) ? (tab as OrderTab) : "needs_action";
  return listOrders({ tab: t, q: q.slice(0, 80), cursor: cursor ?? undefined });
}

/* ───────────── status ───────────── */

export async function changeOrderStatus(input: {
  orderId: string;
  to: string;
  expectedVersion: number;
  reason?: string;
  note?: string;
  undo?: boolean;
  allowNegativeStock?: boolean;
}): Promise<Result<{ status: OrderStatus }>> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  if (!isOrderStatus(input.to)) return { ok: false, error: "Unknown status" };
  if (input.to === "cancelled" && !CANCEL_REASONS.includes(input.reason as CancelReason)) {
    return { ok: false, error: "Choose a cancel reason" };
  }
  if (input.undo && !input.note?.trim()) return { ok: false, error: "Add a reason for the undo" };
  try {
    const res = await db.transaction(async (tx) => {
      const order = await lockOrder(tx, input.orderId);
      if (!order) return { ok: false, error: "Order not found" } as Fail;
      if (input.to === "confirmed" && !order.deliveryFeeConfirmed && order.fulfilment === "delivery") {
        return { ok: false, error: "Set the delivery fee before confirming." } as Fail;
      }
      const patch: Partial<typeof storeOrderTable.$inferInsert> = {};
      if ((input.to === "delivered" || input.to === "picked_up") && !input.undo) patch.deliveryProof = "staff";
      const r = await transitionLocked(tx, order, input.to as OrderStatus, { type: "staff", id: admin.id }, {
        expectedVersion: input.expectedVersion,
        reason: input.reason,
        note: input.note?.slice(0, 500),
        undo: input.undo,
        allowNegativeStock: input.allowNegativeStock,
        patch,
      });
      return r.ok ? ({ ok: true, status: r.status } as const) : ({ ok: false, error: r.error, code: r.code } as Fail);
    });
    refresh(input.orderId);
    return res;
  } catch (error) {
    if (error instanceof StockShortError) {
      return { ok: false, code: "stock", error: `Not enough stock for ${error.items.join(", ")}. Confirm anyway?` };
    }
    console.error("[orders] changeOrderStatus", error);
    return { ok: false, error: "Couldn't update the order." };
  }
}

/* ───────────── payments ───────────── */

export async function recordPayment(input: {
  orderId: string;
  expectedVersion: number;
  method: string;
  amount: number;
  reference: string;
}): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  if (!PAYMENT_METHODS.includes(input.method as PaymentMethod)) return { ok: false, error: "Choose a payment method" };
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return { ok: false, error: "Enter the amount received" };
  const reference = input.reference.trim().slice(0, 120);
  if (input.method !== "cash_on_delivery" && !reference) return { ok: false, error: "Add the transaction ID / reference" };

  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, input.orderId);
    if (!order) return { ok: false, error: "Order not found" } as Fail;
    if (order.version !== input.expectedVersion) return CONFLICT;
    if (["cancelled", "expired", "returned"].includes(order.status)) {
      return { ok: false, error: "This order is closed. Reopen it before recording a payment." } as Fail;
    }
    if (order.paymentStatus === "refund_due" || order.paymentStatus === "refunded") {
      return { ok: false, error: "This order has a refund in progress." } as Fail;
    }
    const paid = round2(parsePrice(order.amountPaid) + amount);
    const total = parsePrice(order.total);
    if (paid > total + 0.009) {
      return { ok: false, error: `That's more than the balance due (${round2(total - parsePrice(order.amountPaid))}).` } as Fail;
    }
    const paymentStatus = paid + 0.004 >= total ? "paid" : "partially_paid";
    const status = isOrderStatus(order.status) ? deriveCompletion(order.status, paymentStatus) : order.status;
    await tx
      .update(storeOrderTable)
      .set({
        amountPaid: paid.toFixed(2),
        paymentStatus,
        paymentMethod: input.method,
        paymentReference: reference || order.paymentReference,
        status,
        attentionReason: order.attentionReason === "payment_to_verify" ? null : order.attentionReason,
        version: order.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(storeOrderTable.id, order.id));
    await addEvent(tx, order.id, { type: "staff", id: admin.id }, {
      type: "payment_recorded",
      customerVisible: true,
      data: { method: input.method, amount, reference, paymentStatus },
    });
    if (status !== order.status) {
      await addEvent(tx, order.id, { type: "staff", id: admin.id }, { type: "status_change", from: order.status, to: status, customerVisible: true });
    }
    return { ok: true } as const;
  });
  refresh(input.orderId);
  return res;
}

/** Customer said "I've paid" but staff can't find it. */
export async function rejectPaymentClaim(orderId: string, expectedVersion: number, note: string): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order) return { ok: false, error: "Order not found" } as Fail;
    if (order.version !== expectedVersion) return CONFLICT;
    if (order.paymentStatus !== "pending_verification") return { ok: false, error: "No payment claim to reject" } as Fail;
    const back = parsePrice(order.amountPaid) > 0 ? "partially_paid" : "unpaid";
    await tx
      .update(storeOrderTable)
      .set({ paymentStatus: back, attentionReason: null, version: order.version + 1, updatedAt: new Date() })
      .where(eq(storeOrderTable.id, orderId));
    await addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "payment_claim_rejected", data: { note: note.slice(0, 300) } });
    return { ok: true } as const;
  });
  refresh(orderId);
  return res;
}

export async function markRefunded(orderId: string, expectedVersion: number, reference: string): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order) return { ok: false, error: "Order not found" } as Fail;
    if (order.version !== expectedVersion) return CONFLICT;
    if (order.paymentStatus !== "refund_due") return { ok: false, error: "No refund is due on this order" } as Fail;
    await tx
      .update(storeOrderTable)
      .set({ paymentStatus: "refunded", version: order.version + 1, updatedAt: new Date() })
      .where(eq(storeOrderTable.id, orderId));
    await addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "refunded", customerVisible: true, data: { reference: reference.slice(0, 120) } });
    return { ok: true } as const;
  });
  refresh(orderId);
  return res;
}

/* ───────────── edits ───────────── */

export async function setDeliveryFee(orderId: string, expectedVersion: number, fee: number): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const value = round2(Number(fee));
  if (!Number.isFinite(value) || value < 0 || value > 100_000) return { ok: false, error: "Enter a valid fee" };
  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order) return { ok: false, error: "Order not found" } as Fail;
    if (order.version !== expectedVersion) return CONFLICT;
    if (!isOrderStatus(order.status) || !EDITABLE.includes(order.status)) return { ok: false, error: "This order can no longer be edited" } as Fail;
    const total = round2(parsePrice(order.subtotal) + value);
    await tx
      .update(storeOrderTable)
      .set({
        shipping: value.toFixed(2),
        total: total.toFixed(2),
        deliveryFeeConfirmed: true,
        paymentStatus: recomputePaymentStatus(order.paymentStatus, parsePrice(order.amountPaid), total),
        version: order.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(storeOrderTable.id, orderId));
    await syncOrderInvoice(tx, orderId, admin.id);
    await addEvent(tx, orderId, { type: "staff", id: admin.id }, {
      type: "edited",
      customerVisible: true,
      data: { field: "deliveryFee", before: parsePrice(order.shipping), after: value, confirmed: true },
    });
    return { ok: true } as const;
  });
  refresh(orderId);
  return res;
}

function recomputePaymentStatus(current: string, paid: number, total: number): string {
  if (current === "refund_due" || current === "refunded" || current === "pending_verification") return current;
  if (paid <= 0) return "unpaid";
  return paid + 0.004 >= total ? "paid" : "partially_paid";
}

/**
 * Replace the order's items (staff edits after a WhatsApp conversation).
 * Prices come from the DB for catalogue items unless staff override them.
 * If stock was already deducted, the difference is moved.
 */
export async function updateOrderItems(input: {
  orderId: string;
  expectedVersion: number;
  items: { productId: string; quantity: number; price?: number }[];
  note?: string;
}): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const items = input.items.filter((i) => i.quantity > 0);
  if (items.length === 0) return { ok: false, error: "An order needs at least one item. Cancel it instead." };
  if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity > 10_000)) return { ok: false, error: "Invalid quantity" };
  if (items.some((i) => i.price !== undefined && (!Number.isFinite(i.price) || i.price < 0 || i.price > 100_000))) {
    return { ok: false, error: "Invalid price" };
  }

  const products = await db
    .select({ id: productTable.id, name: productTable.name, sku: productTable.sku, price: productTable.price, images: productTable.images })
    .from(productTable)
    .where(inArray(productTable.id, items.map((i) => i.productId)));
  const byId = new Map(products.map((p) => [p.id, p]));
  if (items.some((i) => !byId.has(i.productId))) return { ok: false, error: "A product no longer exists" };

  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, input.orderId);
    if (!order) return { ok: false, error: "Order not found" } as Fail;
    if (order.version !== input.expectedVersion) return CONFLICT;
    if (!isOrderStatus(order.status) || !EDITABLE.includes(order.status)) return { ok: false, error: "Items can't be changed once the order is out for delivery" } as Fail;

    const before = await tx.select().from(orderItemTable).where(eq(orderItemTable.orderId, order.id));
    const prevPrice = new Map(before.map((b) => [b.productId, parsePrice(b.price)]));
    const lines = items.map((i) => {
      const p = byId.get(i.productId)!;
      // Keep the price the customer agreed to for existing lines unless staff override.
      const price = round2(i.price ?? prevPrice.get(i.productId) ?? parsePrice(p.price));
      return { productId: i.productId, name: p.name.trim(), sku: p.sku, price, quantity: i.quantity };
    });

    if (order.stockDeducted) {
      const delta = new Map<string, number>();
      for (const b of before) if (b.productId) delta.set(b.productId, (delta.get(b.productId) ?? 0) + b.quantity);
      for (const l of lines) delta.set(l.productId, (delta.get(l.productId) ?? 0) - l.quantity);
      for (const [productId, d] of delta) {
        if (d === 0) continue;
        await tx
          .update(inventoryTable)
          .set({
            quantityInStock: sql`${inventoryTable.quantityInStock} + ${d}`,
            quantityAvailable: sql`${inventoryTable.quantityAvailable} + ${d}`,
            updatedAt: new Date(),
          })
          .where(eq(inventoryTable.productId, productId));
      }
    }

    await tx.delete(orderItemTable).where(eq(orderItemTable.orderId, order.id));
    await tx.insert(orderItemTable).values(
      lines.map((l) => ({
        id: crypto.randomUUID(),
        orderId: order.id,
        productId: l.productId,
        productName: l.name,
        sku: l.sku,
        price: l.price.toFixed(2),
        quantity: l.quantity,
        image: before.find((b) => b.productId === l.productId)?.image ?? null,
      })),
    );
    const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
    const total = round2(subtotal + parsePrice(order.shipping));
    await tx
      .update(storeOrderTable)
      .set({
        subtotal: subtotal.toFixed(2),
        total: total.toFixed(2),
        paymentStatus: recomputePaymentStatus(order.paymentStatus, parsePrice(order.amountPaid), total),
        version: order.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(storeOrderTable.id, order.id));
    await syncOrderInvoice(tx, order.id, admin.id);
    await addEvent(tx, order.id, { type: "staff", id: admin.id }, {
      type: "edited",
      customerVisible: true,
      data: {
        field: "items",
        before: before.map((b) => ({ name: b.productName, quantity: b.quantity, price: parsePrice(b.price) })),
        after: lines.map((l) => ({ name: l.name, quantity: l.quantity, price: l.price })),
        note: input.note?.slice(0, 300),
      },
    });
    return { ok: true } as const;
  });
  refresh(input.orderId);
  return res;
}

export async function assignOrder(orderId: string, adminUserId: string | null): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  if (adminUserId) {
    const staff = await listStaff();
    if (!staff.some((s) => s.id === adminUserId)) return { ok: false, error: "Unknown staff member" };
  }
  const [exists] = await db.select({ id: storeOrderTable.id }).from(storeOrderTable).where(eq(storeOrderTable.id, orderId)).limit(1);
  if (!exists) return { ok: false, error: "Order not found" };
  await db.transaction(async (tx) => {
    await tx
      .update(storeOrderTable)
      .set({ assignedTo: adminUserId, updatedAt: new Date() })
      .where(eq(storeOrderTable.id, orderId));
    await addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "assigned", data: { to: adminUserId } });
  });
  refresh(orderId);
  return { ok: true };
}

export async function addOrderNote(orderId: string, text: string): Promise<Result> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const note = text.trim().slice(0, 1000);
  if (!note) return { ok: false, error: "Write a note" };
  const [exists] = await db.select({ id: storeOrderTable.id }).from(storeOrderTable).where(eq(storeOrderTable.id, orderId)).limit(1);
  if (!exists) return { ok: false, error: "Order not found" };
  await db.transaction((tx) => addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "note", data: { note } }));
  refresh(orderId);
  return { ok: true };
}

/* ───────────── links ───────────── */

export async function rotateCustomerLink(orderId: string): Promise<Result<{ url: string }>> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const token = newToken();
  await db.transaction(async (tx) => {
    await tx.update(storeOrderTable).set({ publicToken: token, updatedAt: new Date() }).where(eq(storeOrderTable.id, orderId));
    await addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "link_rotated", data: { which: "customer" } });
  });
  refresh(orderId);
  return { ok: true, url: orderLink(token) };
}

/** Create (or rotate) the rider's proof-of-delivery link. */
export async function createRiderLink(orderId: string, rotate = false): Promise<Result<{ url: string }>> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!order) return { ok: false, error: "Order not found" } as Fail;
    if (order.fulfilment !== "delivery") return { ok: false, error: "Pickup orders don't need a rider" } as Fail;
    if (isOrderStatus(order.status) && TERMINAL.includes(order.status)) return { ok: false, error: "This order is closed" } as Fail;
    let token = order.riderToken;
    const expired = !order.riderTokenExpiresAt || order.riderTokenExpiresAt < new Date();
    if (!token || rotate || expired) {
      token = newToken();
      await tx
        .update(storeOrderTable)
        .set({ riderToken: token, riderTokenExpiresAt: new Date(Date.now() + RIDER_LINK_TTL_MS), riderFailedAttempts: 0, updatedAt: new Date() })
        .where(eq(storeOrderTable.id, orderId));
      await addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "link_rotated", data: { which: "rider" } });
    }
    return { ok: true, url: `${siteUrl()}/r/${token}` } as const;
  });
  refresh(orderId);
  return res;
}

/* ───────────── one-tap WhatsApp messages ───────────── */

/**
 * Fill a template for this order and return a wa.me link to the customer
 * (or a contact-picker link for the rider message). Logs `message_sent`.
 */
export async function prepareMessage(orderId: string, key: string): Promise<Result<{ text: string; url: string }>> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "Not allowed" };
  if (!WHATSAPP_TEMPLATE_KEYS.includes(key as WhatsappTemplateKey)) return { ok: false, error: "Unknown template" };
  const [order] = await db.select().from(storeOrderTable).where(eq(storeOrderTable.id, orderId)).limit(1);
  if (!order) return { ok: false, error: "Order not found" };
  const items = await db.select().from(orderItemTable).where(eq(orderItemTable.orderId, orderId));
  const whatsapp = await getSettings("whatsapp");

  const extra: Record<string, string> = {};
  if (key === "paymentDetails") extra.paymentDetails = await paymentDetailsText();
  if (key === "riderDispatch") {
    const r = await createRiderLink(orderId);
    if (!r.ok) return r;
    extra.riderLink = r.url;
    // The rider sees the full address (they need it); the customer page doesn't.
    extra.name = order.isGift && order.recipientName ? order.recipientName : order.customerName;
  }
  if (key === "cancelled" && order.cancelReason) {
    extra.reason = CANCEL_REASON_LABELS[order.cancelReason as keyof typeof CANCEL_REASON_LABELS] ?? "";
  }
  const text = await staffMessage(whatsapp[key as WhatsappTemplateKey], order, items, extra);
  // Rider: no number on file → wa.me/?text lets staff pick the rider contact.
  const url =
    key === "riderDispatch"
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : waLink(order.customerPhoneE164 ?? order.customerPhone ?? "", text);
  await db.transaction((tx) => addEvent(tx, orderId, { type: "staff", id: admin.id }, { type: "message_sent", data: { template: key } }));
  return { ok: true, text, url };
}
