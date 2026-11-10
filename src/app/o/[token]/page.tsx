import { Check, Clock, Download, FileText, MapPin, MessageCircle, Package, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { cn } from "@/lib/cn";
import { parsePrice } from "@/lib/format";
import { waDeepLink, waLink } from "@/lib/orders/message";
import { formatMoney } from "@/lib/orders/money";
import { maskPhone } from "@/lib/orders/phone";
import {
  getOrderByToken,
  customerHandoffMessage,
  PAYMENT_METHOD_LABELS,
  paymentDetailsText,
} from "@/lib/orders/server/view";
import {
  CANCEL_REASON_LABELS,
  CUSTOMER_CANCELLABLE,
  CUSTOMER_STATUS_COPY,
  customerStepIndex,
  customerSteps,
  type Fulfilment,
  isOrderStatus,
  type OrderStatus,
  type PaymentMethod,
  STOCK_HELD,
} from "@/lib/orders/status";
import { expireStaleOrders } from "@/lib/orders/server/housekeeping";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

import { AutoRefresh, CustomerActions, HandoffPanel, PaidForm, RestoreCart } from "./order-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const data = await getOrderByToken(token);
  const { brand } = await getPublicSettings();
  return {
    title: data ? `Order ${data.order.orderNumber}` : "Order",
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
    // Generic preview when the link is shared on WhatsApp: no personal data.
    openGraph: { title: `Your ${brand.name} order`, description: "Track your order and delivery." },
  };
}

const EVENT_LABELS: Record<string, string> = {
  created: "Order saved on the website",
  payment_claimed: "You told us you've paid",
  payment_recorded: "Payment received",
  edited: "Order updated by us",
};

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ token }, { new: isNew }] = await Promise.all([params, searchParams]);
  let data = await getOrderByToken(token);
  if (!data) notFound();
  // Lazy expiry: don't wait for the daily cron to show an expired order as expired.
  if (data.order.status === "awaiting_customer" && data.order.expiresAt && data.order.expiresAt < new Date()) {
    await expireStaleOrders();
    data = (await getOrderByToken(token)) ?? data;
  }
  const { order, items, events } = data;
  const status: OrderStatus = isOrderStatus(order.status) ? order.status : "received";
  const fulfilment: Fulfilment = order.fulfilment === "pickup" ? "pickup" : "delivery";

  const [{ brand, contact }, ordering] = await Promise.all([getPublicSettings(), getSettings("ordering")]);
  const businessNumber = contact.whatsappNumber || contact.orderPhone;
  const awaiting = status === "awaiting_customer";

  const message = awaiting ? await customerHandoffMessage(order, items) : "";
  const sendUrl = awaiting ? waLink(businessNumber, message) : "";
  const qrSvg = awaiting ? await QRCode.toString(sendUrl, { type: "svg", margin: 1, width: 180 }) : "";
  const helpUrl = waLink(businessNumber, `Hi ${brand.name}, it's about my order ${order.orderNumber}.`);

  const subtotal = parsePrice(order.subtotal);
  const fee = parsePrice(order.shipping);
  const total = parsePrice(order.total);
  const paid = parsePrice(order.amountPaid);
  const due = Math.max(0, total - paid);
  const isCod = order.preferredPayment === "cash_on_delivery";
  const confirmedOrLater = STOCK_HELD.includes(status);
  const showPaymentDetails =
    confirmedOrLater && !isCod && order.paymentStatus !== "paid" && order.paymentStatus !== "refunded";
  const paymentText = showPaymentDetails ? await paymentDetailsText() : "";

  const copy = CUSTOMER_STATUS_COPY[status];
  const steps = customerSteps(fulfilment);
  const stepIndex = customerStepIndex(status);
  const offPath = stepIndex < 0 || status === "delivery_failed";
  const showCode = fulfilment === "delivery" && (status === "out_for_delivery" || status === "delivery_failed") && order.deliveryCode;
  const cancelText =
    status === "cancelled" && order.cancelReason
      ? CANCEL_REASON_LABELS[order.cancelReason as keyof typeof CANCEL_REASON_LABELS] ?? null
      : null;
  const timeline = events
    .map((e) => ({
      id: e.id,
      at: e.createdAt,
      label:
        e.type === "status_change" || e.type === "undo"
          ? e.toStatus && isOrderStatus(e.toStatus)
            ? CUSTOMER_STATUS_COPY[e.toStatus].title
            : null
          : EVENT_LABELS[e.type] ?? null,
    }))
    .filter((e): e is { id: string; at: Date; label: string } => !!e.label);
  const fmtDate = (d: Date) =>
    d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <AutoRefresh active={!["completed", "cancelled", "expired", "returned"].includes(status)} />
      <main className="section-container w-full max-w-2xl flex-1 py-8 md:py-12">
        <p className="text-sm text-muted-foreground">
          Order <span className="font-mono font-semibold text-foreground">{order.orderNumber}</span> · placed{" "}
          {fmtDate(order.createdAt)}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-heading md:text-4xl">{copy.title}</h1>
        <p className="mt-2 text-muted-foreground">{cancelText ?? copy.body}</p>

        {!offPath ? (
          <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Order progress">
            {steps.map((s, i) => {
              const done = i < stepIndex || (i === stepIndex && i === steps.length - 1);
              const current = i === stepIndex && !done;
              return (
                <li key={s.key} className="flex flex-col items-center gap-1 text-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                      done && "border-brand bg-brand text-white",
                      current && "border-brand text-brand ring-2 ring-brand/30",
                      !done && !current && "border-border text-muted-foreground",
                    )}
                    aria-current={current ? "step" : undefined}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={cn("text-[11px] leading-tight", current ? "font-semibold" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {awaiting ? (
          <HandoffPanel
            token={token}
            autoOpen={isNew === "1"}
            sendUrl={sendUrl}
            deepUrl={waDeepLink(businessNumber, message)}
            message={message}
            qrSvg={qrSvg}
            businessNumber={businessNumber}
            callNumber={contact.orderPhone}
            hours={contact.businessHours}
            responseTime={contact.responseTime}
            note={ordering.handoffNote}
          />
        ) : null}

        {showCode ? (
          <section className="mt-6 rounded-2xl border-2 border-brand bg-brand/5 p-5 text-center">
            <p className="text-sm font-medium">Your delivery code</p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-[0.3em]" data-testid="delivery-code">
              {order.deliveryCode}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Give this code to the rider only when you have your order.
              {order.isGift ? " If it's a gift, share the code with the person receiving it." : ""}
            </p>
          </section>
        ) : null}

        {status === "expired" ? <RestoreCart items={items.map((i) => ({ id: i.productId ?? "", name: i.productName, price: parsePrice(i.price), image: i.image ?? undefined, quantity: i.quantity }))} /> : null}

        {showPaymentDetails ? (
          <section className="mt-6 rounded-2xl border bg-card p-5">
            <h2 className="font-semibold">Payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Amount due: <span className="font-semibold text-foreground">{formatMoney(due)}</span>. Use{" "}
              <span className="font-mono">{order.orderNumber}</span> as your reference.
            </p>
            {paymentText ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-muted p-3 font-sans text-sm">{paymentText}</pre>
            ) : null}
            {order.paymentStatus === "pending_verification" ? (
              <p className="mt-3 text-sm font-medium text-brand">Thanks! We're checking your payment.</p>
            ) : (
              <PaidForm token={token} />
            )}
          </section>
        ) : null}
        {confirmedOrLater && isCod && order.paymentStatus !== "paid" ? (
          <p className="mt-6 rounded-2xl border bg-card p-5 text-sm">
            {fulfilment === "pickup" ? "Pay when you pick up: " : "Pay the rider on delivery: "}
            <span className="font-semibold">{formatMoney(due)}</span>
          </p>
        ) : null}

        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Package className="h-4 w-4" /> Your order
          </h2>
          <ul className="mt-3 divide-y text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 py-2">
                <span>
                  {i.quantity} × {i.productName.trim()}
                </span>
                <span className="shrink-0">{formatMoney(parsePrice(i.price) * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(subtotal)}</dd>
            </div>
            {fulfilment === "delivery" ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery{order.deliveryArea ? ` (${order.deliveryArea})` : ""}</dt>
                <dd>{order.deliveryFeeConfirmed ? (fee > 0 ? formatMoney(fee) : "Free") : "Confirmed on WhatsApp"}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>
                {formatMoney(total)}
                {order.deliveryFeeConfirmed ? "" : " + delivery"}
              </dd>
            </div>
            {paid > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <dt>Paid</dt>
                <dd>{formatMoney(paid)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`/o/${token}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
              data-testid="invoice-link"
            >
              <FileText className="h-4 w-4" />
              {order.confirmedAt ? "View invoice (PDF)" : "View pro-forma invoice (PDF)"}
            </a>
            <a
              href={`/o/${token}/invoice?download=1`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 text-sm sm:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <MapPin className="h-4 w-4" /> {fulfilment === "pickup" ? "Pickup" : "Delivery"}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {fulfilment === "pickup"
                ? order.pickupLocationName
                : [order.deliveryArea, order.deliveryWindow].filter(Boolean).join(" · ")}
            </p>
            {order.isGift ? <p className="mt-1 text-muted-foreground">Gift order</p> : null}
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Phone className="h-4 w-4" /> Contact
            </h2>
            <p className="mt-1 text-muted-foreground">
              {order.customerName.split(/\s+/)[0]} · {maskPhone(order.customerPhoneE164)}
            </p>
            {order.preferredPayment ? (
              <p className="text-muted-foreground">
                Paying by {PAYMENT_METHOD_LABELS[order.preferredPayment as PaymentMethod] ?? order.preferredPayment}
              </p>
            ) : null}
          </div>
        </section>

        <CustomerActions
          token={token}
          canCancel={CUSTOMER_CANCELLABLE.includes(status)}
          canConfirmReceived={status === "ready_for_pickup"}
          receivedLabel="I've picked up my order"
        />

        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" /> Message us about this order
        </a>

        {timeline.length > 0 ? (
          <section className="mt-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4" /> History
            </h2>
            <ol className="mt-3 space-y-2 border-l pl-4 text-sm">
              {timeline.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{e.label}</span>{" "}
                  <span className="text-muted-foreground">· {fmtDate(e.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
