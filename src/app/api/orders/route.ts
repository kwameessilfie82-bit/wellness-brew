import { NextRequest, NextResponse } from "next/server";

import { createStoreOrder } from "@/lib/queries/orders";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await getCurrentUser();

    const {
      customerEmail,
      customerName,
      customerPhone,
      shippingAddress,
      shippingMethod,
      paymentMethod,
      subtotal,
      shipping,
      tax,
      total,
      items,
    } = body;

    const email = customerEmail ?? user?.email;

    if (
      !email ||
      !customerName ||
      !shippingAddress ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required order fields" },
        { status: 400 },
      );
    }

    const order = await createStoreOrder({
      userId: user?.id ?? null,
      customerEmail: email,
      customerName,
      customerPhone,
      shippingAddress,
      shippingMethod,
      paymentMethod,
      subtotal: Number(subtotal),
      shipping: Number(shipping),
      tax: Number(tax),
      total: Number(total),
      items: items.map(
        (item: {
          id: string;
          name: string;
          sku?: string;
          price: number;
          quantity: number;
          image?: string;
        }) => ({
          productId: String(item.id),
          name: item.name,
          sku: item.sku,
          price: Number(item.price),
          quantity: Number(item.quantity),
          image: item.image,
        }),
      ),
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Create order error:", error);
    const message =
      error instanceof Error && error.message.includes("store_order")
        ? "Orders database not ready. Run: npx drizzle-kit push"
        : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
