"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { storeOrderTable } from "@/db/schema";
import { rateLimit } from "@/lib/orders/server/rate-limit";
import { addEvent, lockOrder, transitionLocked } from "@/lib/orders/server/transitions";
import { CUSTOMER_CANCELLABLE, isOrderStatus, TERMINAL } from "@/lib/orders/status";

type Result = { ok: true } | { ok: false; error: string };

const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

async function orderIdFor(token: string): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const [row] = await db
    .select({ id: storeOrderTable.id })
    .from(storeOrderTable)
    .where(eq(storeOrderTable.publicToken, token))
    .limit(1);
  return row?.id ?? null;
}

async function guard(token: string, action: string): Promise<string | Result> {
  if (!(await rateLimit(`cust:${action}:${token}`, 10, 3600))) {
    return { ok: false, error: "Too many attempts. Please message us on WhatsApp." };
  }
  const id = await orderIdFor(token);
  return id ?? { ok: false, error: "Order not found." };
}

/** Logged when the customer taps "Send on WhatsApp" (hand-off funnel metric). */
export async function logHandoffClick(token: string): Promise<void> {
  const id = await guard(token, "handoff");
  if (typeof id !== "string") return;
  await db.transaction((tx) => addEvent(tx, id, { type: "customer" }, { type: "whatsapp_handoff_click" }));
}

export async function customerCancel(token: string): Promise<Result> {
  const id = await guard(token, "cancel");
  if (typeof id !== "string") return id;
  return db.transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (!order || !isOrderStatus(order.status)) return { ok: false, error: "Order not found." };
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      return { ok: false, error: "This order is already confirmed. Message us on WhatsApp to cancel it." };
    }
    const res = await transitionLocked(tx, order, "cancelled", { type: "customer" }, { reason: "customer_request" });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  });
}

export async function customerPaid(token: string, reference: string): Promise<Result> {
  const id = await guard(token, "paid");
  if (typeof id !== "string") return id;
  const ref = reference.trim().slice(0, 120);
  return db.transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (!order || !isOrderStatus(order.status)) return { ok: false, error: "Order not found." };
    if (TERMINAL.includes(order.status) && order.status !== "completed") {
      return { ok: false, error: "This order is closed. Message us on WhatsApp." };
    }
    if (order.paymentStatus === "paid") return { ok: true };
    await tx
      .update(storeOrderTable)
      .set({
        paymentStatus: "pending_verification",
        paymentReference: ref || order.paymentReference,
        attentionReason: "payment_to_verify",
        version: order.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(storeOrderTable.id, id));
    await addEvent(tx, id, { type: "customer" }, { type: "payment_claimed", data: { reference: ref }, customerVisible: true });
    return { ok: true };
  });
}

export async function customerReceived(token: string): Promise<Result> {
  const id = await guard(token, "received");
  if (typeof id !== "string") return id;
  return db.transaction(async (tx) => {
    const order = await lockOrder(tx, id);
    if (!order) return { ok: false, error: "Order not found." };
    const to = order.status === "ready_for_pickup" ? "picked_up" : order.status === "out_for_delivery" ? "delivered" : null;
    if (!to) return { ok: false, error: "This order isn't out for delivery yet." };
    const res = await transitionLocked(tx, order, to, { type: "customer" }, { patch: { deliveryProof: "customer" } });
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  });
}
