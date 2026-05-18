import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  isPaystackConfigured,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import {
  fetchOrderByPaymentReference,
  markOrderPaid,
} from "@/lib/queries/orders";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference");

  if (!reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await fetchOrderByPaymentReference(reference);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.userId && order.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.json({ success: true, orderId: order.id });
  }

  if (!isPaystackConfigured()) {
    await markOrderPaid(order.id, reference);
    return NextResponse.json({ success: true, orderId: order.id });
  }

  try {
    const payment = await verifyPaystackTransaction(reference);

    if (payment.status !== "success") {
      return NextResponse.json(
        { error: "Payment was not successful" },
        { status: 402 },
      );
    }

    await markOrderPaid(order.id, reference);
    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    console.error("Paystack verify error:", error);
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 500 },
    );
  }
}
