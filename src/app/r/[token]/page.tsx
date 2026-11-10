import { eq } from "drizzle-orm";
import type { Metadata } from "next";

import { db } from "@/db";
import { orderItemTable, storeOrderTable } from "@/db/schema";
import { parsePrice } from "@/lib/format";
import { formatMoney } from "@/lib/orders/money";
import { formatLocalPhone } from "@/lib/orders/phone";
import { STATUS_LABELS, isOrderStatus } from "@/lib/orders/status";
import { getPublicSettings } from "@/lib/settings/get";
import { telLink } from "@/lib/settings/schemas";

import { RiderPanel } from "./rider-client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Delivery",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

type Props = { params: Promise<{ token: string }> };

export default async function RiderPage({ params }: Props) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{16,64}$/.test(token);
  const [order] = valid
    ? await db.select().from(storeOrderTable).where(eq(storeOrderTable.riderToken, token)).limit(1)
    : [];
  const { contact } = await getPublicSettings();
  const shopPhone = contact.orderPhone || contact.whatsappNumber;

  if (!order || !order.riderTokenExpiresAt || order.riderTokenExpiresAt < new Date()) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-xl font-bold">This delivery link isn&apos;t valid</h1>
        <p className="mt-2 text-muted-foreground">It may have expired or been replaced. Ask the shop for a new link.</p>
        {shopPhone ? (
          <a href={telLink(shopPhone)} className="mt-4 inline-block rounded-full border px-4 py-2">
            Call the shop
          </a>
        ) : null}
      </main>
    );
  }

  const items = await db
    .select({ name: orderItemTable.productName, quantity: orderItemTable.quantity })
    .from(orderItemTable)
    .where(eq(orderItemTable.orderId, order.id));
  const due = Math.max(0, parsePrice(order.total) - parsePrice(order.amountPaid));
  const collect = order.preferredPayment === "cash_on_delivery" && order.paymentStatus !== "paid" && due > 0;
  const recipientPhone = order.isGift && order.recipientPhone ? order.recipientPhone : order.customerPhoneE164;
  const recipientName = order.isGift && order.recipientName ? order.recipientName : order.customerName;
  const address = [order.shippingAddress, order.deliveryArea].filter(Boolean).join(", ");
  const mapQuery = order.gpsAddress || address;
  const status = isOrderStatus(order.status) ? order.status : "confirmed";

  return (
    <main className="mx-auto max-w-md space-y-4 p-4">
      <header>
        <p className="text-sm text-muted-foreground">Delivery</p>
        <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
        <p className="text-sm">Status: {STATUS_LABELS[status]}</p>
      </header>

      <section className="rounded-xl border p-4">
        <p className="text-lg font-semibold">{recipientName}</p>
        {order.isGift ? <p className="text-sm text-muted-foreground">Gift from {order.customerName}</p> : null}
        <p className="mt-2">{address || "No address given"}</p>
        {order.gpsAddress ? <p className="text-sm text-muted-foreground">GPS: {order.gpsAddress}</p> : null}
        {order.deliveryWindow ? <p className="text-sm text-muted-foreground">Time: {order.deliveryWindow}</p> : null}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          {recipientPhone ? (
            <>
              <a href={telLink(recipientPhone)} className="rounded-lg border py-2 font-medium">
                Call
              </a>
              <a
                href={`https://wa.me/${recipientPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border py-2 font-medium"
              >
                WhatsApp
              </a>
            </>
          ) : null}
          {mapQuery ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border py-2 font-medium"
            >
              Map
            </a>
          ) : null}
        </div>
        {recipientPhone ? <p className="mt-2 text-xs text-muted-foreground">{formatLocalPhone(recipientPhone)}</p> : null}
      </section>

      <section className="rounded-xl border p-4 text-sm">
        <p className="font-semibold">Package</p>
        <ul className="mt-1">
          {items.map((i, idx) => (
            <li key={idx}>
              {i.quantity} × {i.name.trim()}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-base font-semibold">
          {collect ? `Collect: ${formatMoney(due)}` : "Already paid — nothing to collect"}
        </p>
      </section>

      <RiderPanel
        token={token}
        status={status}
        collect={collect}
        dueText={formatMoney(due)}
        locked={order.riderFailedAttempts >= 5}
        shopPhone={shopPhone}
      />
    </main>
  );
}
