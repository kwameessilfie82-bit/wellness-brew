import { NextRequest, NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";
import { getCurrentUser } from "@/lib/auth";
import { formatGhanaPhone } from "@/lib/ghana";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
} from "@/lib/paystack";
import { updateUserProfile } from "@/lib/queries/profile";
import { createStoreOrder } from "@/lib/queries/orders";

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
    const {
      customerName,
      customerPhone,
      deliveryAddress,
      paymentMethod,
      subtotal,
      deliveryFee,
      total,
      items,
    } = body;

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

    const phone = formatGhanaPhone(customerPhone);
    const orderTotal = Number(total);
    const orderSubtotal = Number(subtotal);
    const orderDelivery = Number(deliveryFee) || 0;

    if (orderTotal <= 0) {
      return NextResponse.json({ error: "Invalid order total" }, { status: 400 });
    }

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
      shipping: orderDelivery,
      tax: 0,
      total: orderTotal,
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
