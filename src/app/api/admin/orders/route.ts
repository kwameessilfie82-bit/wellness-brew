import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-middleware";
import { fetchStoreOrders } from "@/lib/queries/orders";

const getHandler = withAdminAuth(async (request) => {
  try {
    const url = new URL(
      request.url,
      request.url.startsWith("http")
        ? undefined
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" || "https://wellness-brew.vercel.app",
    );
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");

    const orders = await fetchStoreOrders({
      search: search ?? undefined,
      status: status ?? undefined,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Admin orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders", orders: [] },
      { status: 500 },
    );
  }
}, "canManageOrders");

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return getHandler(request);
}
