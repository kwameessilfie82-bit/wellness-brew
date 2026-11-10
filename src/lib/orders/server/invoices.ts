import "server-only";

import { eq, inArray } from "drizzle-orm";

import { invoiceItemTable, invoiceTable, orderItemTable, productTable, storeOrderTable } from "@/db/schema";
import { parsePrice } from "@/lib/format";

import { isOrderStatus, STOCK_HELD } from "../status";
import type { Tx } from "./transitions";

/**
 * Keep one invoice per confirmed WhatsApp order so sales analytics include it.
 * Confirmed or later → upsert (rebuilt from the order); cancelled/returned → removed.
 * Call inside the transaction that changed the order.
 */
export async function syncOrderInvoice(tx: Tx, orderId: string, createdBy: string | null): Promise<void> {
  const [order] = await tx.select().from(storeOrderTable).where(eq(storeOrderTable.id, orderId)).limit(1);
  if (!order) return;
  const [existing] = await tx.select({ id: invoiceTable.id }).from(invoiceTable).where(eq(invoiceTable.orderId, orderId)).limit(1);
  const counts = isOrderStatus(order.status) && STOCK_HELD.includes(order.status);

  if (!counts) {
    if (existing) await tx.delete(invoiceTable).where(eq(invoiceTable.id, existing.id));
    return;
  }

  const items = await tx.select().from(orderItemTable).where(eq(orderItemTable.orderId, orderId));
  const productIds = items.map((i) => i.productId).filter((x): x is string => !!x);
  const cats = productIds.length
    ? await tx.select({ id: productTable.id, categoryId: productTable.categoryId }).from(productTable).where(inArray(productTable.id, productIds))
    : [];
  const catOf = new Map(cats.map((c) => [c.id, c.categoryId]));

  const invoiceId = existing?.id ?? crypto.randomUUID();
  const values = {
    invoiceNumber: order.orderNumber,
    invoiceDate: order.confirmedAt ?? new Date(),
    clientName: order.customerName,
    clientPhone: order.customerPhoneE164 ?? order.customerPhone,
    clientEmail: order.customerEmail,
    clientAddress: order.fulfilment === "pickup" ? `Pickup: ${order.pickupLocationName ?? ""}` : [order.deliveryArea, order.shippingAddress].filter(Boolean).join(", "),
    subtotal: order.subtotal,
    deliveries: order.shipping,
    total: order.total,
  };
  if (existing) {
    await tx.update(invoiceTable).set(values).where(eq(invoiceTable.id, invoiceId));
    await tx.delete(invoiceItemTable).where(eq(invoiceItemTable.invoiceId, invoiceId));
  } else {
    await tx.insert(invoiceTable).values({ id: invoiceId, orderId, createdBy, createdAt: new Date(), ...values });
  }
  if (items.length) {
    await tx.insert(invoiceItemTable).values(
      items.map((i) => ({
        id: crypto.randomUUID(),
        invoiceId,
        productId: i.productId,
        categoryId: i.productId ? catOf.get(i.productId) ?? null : null,
        productName: i.productName,
        priceType: "customer",
        unitPrice: i.price,
        quantity: i.quantity,
        lineTotal: (parsePrice(i.price) * i.quantity).toFixed(2),
      })),
    );
  }
}
