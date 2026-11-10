import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { parsePrice } from "@/lib/format";
import { fetchOrderById } from "@/lib/queries/orders";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await fetchOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const isOwner = order.userId
    ? order.userId === user.id
    : order.customerEmail === user.email;
  if (!isOwner) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: parsePrice(order.subtotal),
      shipping: parsePrice(order.shipping),
      total: parsePrice(order.total),
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
    },
  });
}
