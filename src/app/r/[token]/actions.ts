"use server";

import { timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { storeOrderTable } from "@/db/schema";
import { parsePrice } from "@/lib/format";
import { round2 } from "@/lib/orders/money";
import { rateLimit } from "@/lib/orders/server/rate-limit";
import { addEvent, transitionLocked } from "@/lib/orders/server/transitions";
type Result = { ok: true } | { ok: false; error: string; locked?: boolean };

const MAX_RIDER_ATTEMPTS = 5;
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;
const RIDER = { type: "rider" } as const;

async function lockByRiderToken(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], token: string) {
  if (!TOKEN_RE.test(token)) return undefined;
  const [row] = await tx.select().from(storeOrderTable).where(eq(storeOrderTable.riderToken, token)).for("update");
  if (!row || !row.riderTokenExpiresAt || row.riderTokenExpiresAt < new Date()) return undefined;
  return row;
}

function codesMatch(a: string, b: string): boolean {
  const x = Buffer.from(a.padEnd(8, " "));
  const y = Buffer.from(b.padEnd(8, " "));
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Rider picked the order up: confirmed/preparing → out for delivery. */
export async function riderStart(token: string): Promise<Result> {
  if (!(await rateLimit(`rider:start:${token}`, 10, 3600))) return { ok: false, error: "Too many attempts" };
  return db.transaction(async (tx) => {
    const order = await lockByRiderToken(tx, token);
    if (!order) return { ok: false, error: "This delivery link isn't valid any more. Ask the shop for a new one." };
    if (order.status === "out_for_delivery") return { ok: true };
    if (order.status !== "confirmed" && order.status !== "preparing" && order.status !== "delivery_failed") {
      return { ok: false, error: "This order can't be sent out right now. Call the shop." };
    }
    const r = await transitionLocked(tx, order, "out_for_delivery", RIDER);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
}

/** Rider enters the customer's code → delivered (+ optional cash collected). */
export async function riderConfirm(token: string, code: string, cashCollected: boolean): Promise<Result> {
  if (!(await rateLimit(`rider:confirm:${token}`, 20, 3600))) return { ok: false, error: "Too many attempts. Call the shop." };
  const entered = code.replace(/\D/g, "").slice(0, 8);
  return db.transaction(async (tx) => {
    const order = await lockByRiderToken(tx, token);
    if (!order) return { ok: false, error: "This delivery link isn't valid any more. Ask the shop for a new one." };
    if (order.status === "delivered" || order.status === "completed") return { ok: true };
    if (order.status !== "out_for_delivery") return { ok: false, error: "Tap “Start delivery” first." };
    if (order.riderFailedAttempts >= MAX_RIDER_ATTEMPTS) {
      return { ok: false, locked: true, error: "Too many wrong codes. Call the shop to confirm this delivery." };
    }
    if (!order.deliveryCode || !codesMatch(entered, order.deliveryCode)) {
      const attempts = order.riderFailedAttempts + 1;
      const locked = attempts >= MAX_RIDER_ATTEMPTS;
      await tx
        .update(storeOrderTable)
        .set({ riderFailedAttempts: attempts, attentionReason: locked ? "rider_locked" : order.attentionReason, updatedAt: new Date() })
        .where(eq(storeOrderTable.id, order.id));
      await addEvent(tx, order.id, RIDER, { type: "rider_wrong_code", data: { attempts } });
      return {
        ok: false,
        locked,
        error: locked
          ? "Too many wrong codes. Call the shop to confirm this delivery."
          : `That code is wrong. ${MAX_RIDER_ATTEMPTS - attempts} tries left.`,
      };
    }

    const patch: Partial<typeof storeOrderTable.$inferInsert> = { deliveryProof: "code" };
    const isCod = order.preferredPayment === "cash_on_delivery";
    const due = round2(parsePrice(order.total) - parsePrice(order.amountPaid));
    if (isCod && cashCollected && due > 0 && order.paymentStatus !== "paid") {
      patch.amountPaid = parsePrice(order.total).toFixed(2);
      patch.paymentStatus = "paid";
      patch.paymentMethod = "cash_on_delivery";
      patch.paymentReference = order.paymentReference ?? "Collected by rider";
    }
    const r = await transitionLocked(tx, order, "delivered", RIDER, {
      patch,
      eventData: patch.paymentStatus === "paid" ? { cashCollected: due } : undefined,
    });
    if (r.ok && patch.paymentStatus === "paid") {
      await addEvent(tx, order.id, RIDER, {
        type: "payment_recorded",
        customerVisible: true,
        data: { method: "cash_on_delivery", amount: due, reference: "Collected by rider", paymentStatus: "paid" },
      });
    }
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
}

export async function riderFailed(token: string, reason: string): Promise<Result> {
  if (!(await rateLimit(`rider:fail:${token}`, 10, 3600))) return { ok: false, error: "Too many attempts" };
  const why = reason.trim().slice(0, 300);
  if (!why) return { ok: false, error: "Say what happened" };
  return db.transaction(async (tx) => {
    const order = await lockByRiderToken(tx, token);
    if (!order) return { ok: false, error: "This delivery link isn't valid any more." };
    if (order.status !== "out_for_delivery") return { ok: false, error: "This order isn't out for delivery." };
    const r = await transitionLocked(tx, order, "delivery_failed", RIDER, {
      note: why,
      patch: { attentionReason: "delivery_failed" },
    });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  });
}
