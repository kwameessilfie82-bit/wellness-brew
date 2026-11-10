import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItemTable, storeOrderTable } from "@/db/schema";
import { waLink } from "@/lib/orders/message";
import { customerHandoffMessage } from "@/lib/orders/server/view";
import { getPublicSettings } from "@/lib/settings/get";

export const dynamic = "force-dynamic";

/**
 * Short link for the order page's QR code. Encoding the full wa.me URL (with
 * the whole order message) made the QR too dense to scan off a screen; this
 * ~60-char link redirects to the same WhatsApp handoff instead.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const orderPage = new URL(`/o/${token}`, request.url);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });

  const [order] = await db.select().from(storeOrderTable).where(eq(storeOrderTable.publicToken, token)).limit(1);
  if (!order) return new Response("Not found", { status: 404 });
  if (order.status !== "awaiting_customer") return Response.redirect(orderPage, 303);

  const [items, { contact }] = await Promise.all([
    db.select().from(orderItemTable).where(eq(orderItemTable.orderId, order.id)),
    getPublicSettings(),
  ]);
  const message = await customerHandoffMessage(order, items);
  return new Response(null, {
    status: 302,
    headers: {
      Location: waLink(contact.whatsappNumber || contact.orderPhone, message),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
