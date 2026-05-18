import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { fetchOrdersForUser } from "@/lib/queries/orders";
import { parsePrice } from "@/lib/format";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await fetchOrdersForUser(user.id);

  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      total: parsePrice(order.total),
      subtotal: parsePrice(order.subtotal),
      createdAt: order.createdAt,
      deliveryAddress: (() => {
        try {
          return JSON.parse(order.shippingAddress) as Record<string, string>;
        } catch {
          return { location: order.shippingAddress };
        }
      })(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.productName,
        price: parsePrice(item.price),
        quantity: item.quantity,
        image: item.image,
      })),
    })),
  });
}
