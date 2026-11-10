import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { productTable } from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { getProductThumbnail, parsePrice } from "@/lib/format";
import { formatGhanaPhone } from "@/lib/ghana";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
} from "@/lib/paystack";
import { updateUserProfile } from "@/lib/queries/profile";
import { createStoreOrder } from "@/lib/queries/orders";

const DELIVERY_FEE = 0;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in required to complete checkout" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { customerName, customerPhone, deliveryAddress, paymentMethod, items } =
      body;

    if (
      !customerName?.trim() ||
      !customerPhone?.trim() ||
      !deliveryAddress?.region ||
      !deliveryAddress?.location ||
      !Array.isArray(items) ||
      items.length === 0 ||
      !paymentMethod
    ) {
      return NextResponse.json(
        { error: "Missing required checkout fields" },
        { status: 400 },
      );
    }

    if (!["card", "momo"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 },
      );
    }

    // Validate quantities and collect product ids
    const requested = new Map<string, number>();
    for (const item of items as { id: unknown; quantity: unknown }[]) {
      const id = String(item.id ?? "");
      const quantity = Number(item.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        return NextResponse.json(
          { error: "Invalid cart item quantity" },
          { status: 400 },
        );
      }
      requested.set(id, (requested.get(id) ?? 0) + quantity);
    }

    // Price everything from the database — never trust client-side prices
    const productIds = [...requested.keys()];
    const products = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        sku: productTable.sku,
        price: productTable.price,
        images: productTable.images,
      })
      .from(productTable)
      .where(
        and(
          inArray(productTable.id, productIds),
          eq(productTable.isActive, true),
        ),
      );

    if (products.length !== productIds.length) {
      return NextResponse.json(
        {
          error:
            "Some items in your cart are no longer available. Please review your cart.",
        },
        { status: 400 },
      );
    }

    const orderItems = products.map((product) => ({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: parsePrice(product.price),
      quantity: requested.get(product.id)!,
      image: getProductThumbnail(product.images),
    }));

    const orderSubtotal =
      Math.round(
        orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0) *
          100,
      ) / 100;
    const orderTotal = orderSubtotal + DELIVERY_FEE;

    if (!Number.isFinite(orderTotal) || orderTotal <= 0) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

    const phone = formatGhanaPhone(customerPhone);
    const paymentReference = `WB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const order = await createStoreOrder({
      userId: user.id,
      customerEmail: user.email,
      customerName: customerName.trim(),
      customerPhone: phone,
      shippingAddress: {
        region: deliveryAddress.region,
        location: deliveryAddress.location,
        landmark: deliveryAddress.landmark ?? "",
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude,
      },
      shippingMethod: "delivery",
      paymentMethod,
      paymentReference,
      status: "pending_payment",
      subtotal: orderSubtotal,
      shipping: DELIVERY_FEE,
      tax: 0,
      total: orderTotal,
      items: orderItems,
    });

    await updateUserProfile(user.id, {
      name: customerName.trim(),
      phone,
      deliveryRegion: deliveryAddress.region,
      deliveryLocation: deliveryAddress.location,
      deliveryLandmark: deliveryAddress.landmark ?? null,
      deliveryLatitude:
        deliveryAddress.latitude != null
          ? String(deliveryAddress.latitude)
          : null,
      deliveryLongitude:
        deliveryAddress.longitude != null
          ? String(deliveryAddress.longitude)
          : null,
    });

    if (!isPaystackConfigured()) {
      return NextResponse.json({
        success: true,
        order,
        paymentSkipped: true,
        redirectUrl: `/order-confirmation?orderId=${order.id}`,
      });
    }

    const baseUrl = getAppBaseUrl(request);

    const paystack = await initializePaystackTransaction({
      email: user.email,
      amountPesewas: Math.round(orderTotal * 100),
      reference: paymentReference,
      channels: paymentMethod === "momo" ? ["mobile_money"] : ["card"],
      metadata: { order_id: order.id, custom_fields: [] },
      callbackUrl: `${baseUrl}/checkout/verify?reference=${paymentReference}`,
    });

    return NextResponse.json({
      success: true,
      order,
      authorizationUrl: paystack.authorization_url,
      reference: paymentReference,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
