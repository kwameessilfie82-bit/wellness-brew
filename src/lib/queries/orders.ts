import "server-only";

import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  inventoryTable,
  inventoryTransactionTable,
  orderItemTable,
  productTable,
  storeOrderTable,
} from "@/db/schema";

export type CreateOrderItemInput = {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  image?: string;
};

export type CreateOrderInput = {
  userId?: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: Record<string, string | number | undefined>;
  shippingMethod?: string;
  paymentMethod?: string;
  paymentReference?: string;
  status?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  items: CreateOrderItemInput[];
};

export async function createStoreOrder(input: CreateOrderInput) {
  const now = new Date();
  const orderId = `ord-${Date.now()}`;
  const orderNumber = `WB-${Date.now().toString(36).toUpperCase()}`;

  await db.transaction(async (tx) => {
    await tx.insert(storeOrderTable).values({
      id: orderId,
      orderNumber,
      userId: input.userId ?? null,
      status: input.status ?? "pending_payment",
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone ?? null,
      shippingAddress: JSON.stringify(input.shippingAddress),
      shippingMethod: input.shippingMethod ?? null,
      paymentMethod: input.paymentMethod ?? null,
      paymentReference: input.paymentReference ?? null,
      paymentStatus: "pending",
      subtotal: String(input.subtotal),
      shipping: String(input.shipping),
      tax: String(input.tax),
      total: String(input.total),
      createdAt: now,
      updatedAt: now,
    });

    for (const item of input.items) {
      await tx.insert(orderItemTable).values({
        id: `oi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderId,
        productId: item.productId,
        productName: item.name,
        sku: item.sku ?? null,
        price: String(item.price),
        quantity: item.quantity,
        image: item.image ?? null,
      });

      const inv = await tx.query.inventoryTable.findFirst({
        where: eq(inventoryTable.productId, item.productId),
      });

      if (inv) {
        const newStock = Math.max(0, inv.quantityInStock - item.quantity);
        const newAvailable = Math.max(0, newStock - inv.quantityReserved);

        await tx
          .update(inventoryTable)
          .set({
            quantityInStock: newStock,
            quantityAvailable: newAvailable,
            updatedAt: now,
          })
          .where(eq(inventoryTable.id, inv.id));
      }
    }
  });

  return { id: orderId, orderNumber };
}

export async function fetchStoreOrders(params?: {
  search?: string;
  status?: string;
  limit?: number;
}) {
  const limit = params?.limit ?? 100;
  const conditions: SQL[] = [];

  if (params?.status && params.status !== "all") {
    conditions.push(eq(storeOrderTable.status, params.status));
  }

  if (params?.search?.trim()) {
    const term = `%${params.search.trim()}%`;
    conditions.push(
      or(
        ilike(storeOrderTable.orderNumber, term),
        ilike(storeOrderTable.customerName, term),
        ilike(storeOrderTable.customerEmail, term),
      )!,
    );
  }

  const orders = await db.query.storeOrderTable.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(storeOrderTable.createdAt)],
    limit,
    with: { items: true },
  });

  return orders;
}

export async function updateOrderStatus(orderId: string, status: string) {
  await db
    .update(storeOrderTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(storeOrderTable.id, orderId));
}

export async function fetchOrderById(orderId: string) {
  return db.query.storeOrderTable.findFirst({
    where: eq(storeOrderTable.id, orderId),
    with: { items: true },
  });
}

export async function fetchOrdersForUser(userId: string, limit = 50) {
  return db.query.storeOrderTable.findMany({
    where: eq(storeOrderTable.userId, userId),
    orderBy: [desc(storeOrderTable.createdAt)],
    limit,
    with: { items: true },
  });
}

export async function markOrderPaid(orderId: string, paymentReference: string) {
  const now = new Date();
  await db
    .update(storeOrderTable)
    .set({
      status: "processing",
      paymentStatus: "paid",
      paymentReference,
      updatedAt: now,
    })
    .where(eq(storeOrderTable.id, orderId));
}

export async function fetchOrderByPaymentReference(reference: string) {
  return db.query.storeOrderTable.findFirst({
    where: eq(storeOrderTable.paymentReference, reference),
    with: { items: true },
  });
}
