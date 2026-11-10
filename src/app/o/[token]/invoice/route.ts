import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItemTable, storeOrderTable } from "@/db/schema";
import { buildOrderInvoicePdf, invoiceFileName } from "@/lib/orders/server/invoice-pdf";

export const dynamic = "force-dynamic";

/**
 * The order's invoice PDF. Protected by the unguessable order token (the same
 * link the customer already has); resetting the link revokes old copies.
 * ?download=1 forces a download instead of opening in the browser.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const [order] = await db.select().from(storeOrderTable).where(eq(storeOrderTable.publicToken, token)).limit(1);
  if (!order) return new Response("Not found", { status: 404 });
  const items = await db.select().from(orderItemTable).where(eq(orderItemTable.orderId, order.id));

  try {
    const pdf = await buildOrderInvoicePdf(order, items);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${invoiceFileName(order)}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex, nofollow",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("[invoice pdf] failed:", error);
    return new Response("Couldn't create the invoice right now. Please try again.", { status: 500 });
  }
}
