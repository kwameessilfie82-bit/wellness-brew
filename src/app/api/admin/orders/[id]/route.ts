import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-middleware";
import { fetchOrderById, updateOrderStatus } from "@/lib/queries/orders";

const patchHandler = withAdminAuth(
  async (request, _adminUser, context) => {
    try {
      const params = context?.params as { id: string };
      const body = await request.json();
      const { status } = body;

      if (!status) {
        return NextResponse.json({ error: "Status required" }, { status: 400 });
      }

      await updateOrderStatus(params.id, status);
      const order = await fetchOrderById(params.id);

      return NextResponse.json({ order });
    } catch (error) {
      console.error("Update order error:", error);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }
  },
  "canManageOrders",
);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return patchHandler(request, { params: { id } });
}
