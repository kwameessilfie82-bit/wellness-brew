import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderEventTable, orderItemTable, storeOrderTable } from "@/db/schema";
import { getAppBaseUrl } from "@/lib/app-url";
import { parsePrice } from "@/lib/format";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand } from "@/lib/settings/schemas";

import { orderMapsUrl } from "../location";
import { buildOrderMessage, fillTemplateCompact, formatItemLines, type MessageItem, type MessageVars } from "../message";
import { formatMoney } from "../money";
import { formatLocalPhone } from "../phone";
import type { PaymentMethod } from "../status";

export type OrderRow = typeof storeOrderTable.$inferSelect;
export type OrderItemRow = typeof orderItemTable.$inferSelect;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  momo: "Mobile Money",
  bank: "Bank transfer",
  cash_on_delivery: "Pay on delivery",
};

export async function getOrderByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const [order] = await db.select().from(storeOrderTable).where(eq(storeOrderTable.publicToken, token)).limit(1);
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItemTable).where(eq(orderItemTable.orderId, order.id)),
    db
      .select({
        id: orderEventTable.id,
        type: orderEventTable.type,
        toStatus: orderEventTable.toStatus,
        createdAt: orderEventTable.createdAt,
      })
      .from(orderEventTable)
      .where(and(eq(orderEventTable.orderId, order.id), eq(orderEventTable.customerVisible, true)))
      .orderBy(asc(orderEventTable.createdAt)),
  ]);
  return { order, items, events };
}

export function siteUrl(): string {
  // Customer links must use the canonical domain, never a per-deployment URL.
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    getAppBaseUrl();
  return raw.replace(/\/+$/, "");
}

export function invoiceLink(token: string) {
  return `${siteUrl()}/o/${token}/invoice`;
}

export function orderLink(token: string) {
  return `${siteUrl()}/o/${token}`;
}

export function messageItems(items: OrderItemRow[]): MessageItem[] {
  return items.map((i) => {
    const unit = parsePrice(i.price);
    return { name: i.productName.trim(), quantity: i.quantity, unitPrice: formatMoney(unit), lineTotal: formatMoney(unit * i.quantity) };
  });
}

/** Payment instructions text from Settings → Payments, filtered by what ordering allows. */
export async function paymentDetailsText(): Promise<string> {
  const [payments, ordering] = await Promise.all([getSettings("payments"), getSettings("ordering")]);
  const parts: string[] = [];
  if (ordering.momoEnabled && payments.momoMerchantId) {
    parts.push(
      [
        `${payments.momoProvider || "MoMo"} Mobile Money`,
        payments.momoMerchantName && `Name: ${payments.momoMerchantName}`,
        `Merchant ID: ${payments.momoMerchantId}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  if (ordering.bankEnabled && payments.bankAccountNumber) {
    parts.push(
      [
        `Bank: ${payments.bankName}`,
        payments.bankBranch && `Branch: ${payments.bankBranch}`,
        `Account name: ${payments.bankAccountName}`,
        `Account number: ${payments.bankAccountNumber}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return parts.join("\n\n");
}

/** Variables shared by every WhatsApp template. */
export async function templateVars(order: OrderRow, items: OrderItemRow[], extra: MessageVars = {}): Promise<MessageVars> {
  const { brand, contact } = await getPublicSettings();
  const subtotal = parsePrice(order.subtotal);
  const fee = parsePrice(order.shipping);
  const total = parsePrice(order.total);
  const due = Math.max(0, total - parsePrice(order.amountPaid));
  const isPickup = order.fulfilment === "pickup";
  const area = order.deliveryArea ?? "";
  const feeText = isPickup
    ? ""
    : !order.deliveryFeeConfirmed
      ? `${area} (fee to be confirmed)`.trim()
      : `${area ? `${area} ` : ""}${fee > 0 ? formatMoney(fee) : "Free"}`;
  const pin = isPickup ? null : orderMapsUrl(order);
  const fulfilmentText = isPickup
    ? `Pickup: ${order.pickupLocationName ?? ""}`
    : `Delivery to: ${[order.deliveryArea, order.shippingAddress].filter(Boolean).join(", ")}${order.deliveryWindow ? ` (${order.deliveryWindow})` : ""}${pin ? `\nMap pin: ${pin}` : ""}`;
  const lines = (...rows: (string | false | null | undefined)[]) => rows.filter(Boolean).join("\n");
  const fulfilmentBlock = isPickup
    ? lines("🏬 *PICKUP*", order.pickupLocationName && `Location: ${order.pickupLocationName}`)
    : lines(
        "🚚 *DELIVERY*",
        area && `Area: ${area}`,
        order.shippingAddress && `Address: ${order.shippingAddress}`,
        order.gpsAddress && `GPS: ${order.gpsAddress}`,
        order.deliveryWindow && `Time: ${order.deliveryWindow}`,
        pin && `Map: ${pin}`,
      );
  const totalText = order.deliveryFeeConfirmed || isPickup ? formatMoney(total) : `${formatMoney(total)} + delivery`;
  const paymentText = order.preferredPayment ? PAYMENT_METHOD_LABELS[order.preferredPayment as PaymentMethod] ?? "" : "";
  const deliveryLine = isPickup
    ? ""
    : `Delivery: ${!order.deliveryFeeConfirmed ? "To be confirmed" : fee > 0 ? formatMoney(fee) : "Free"}${area ? ` (${area})` : ""}`;
  const totalsBlock = lines(
    `Subtotal: ${formatMoney(subtotal)}`,
    deliveryLine,
    `*Total: ${totalText}*`,
    paymentText && `Pay by: ${paymentText}`,
  );
  const phone = formatLocalPhone(order.customerPhoneE164) || order.customerPhone || "";
  const giftFor = order.isGift
    ? `${order.recipientName ?? "someone special"}${order.recipientPhone ? ` (${formatLocalPhone(order.recipientPhone)})` : ""}`
    : "";
  return {
    brand: brand.name,
    orderNumber: order.orderNumber,
    name: order.customerName.split(/\s+/)[0] ?? order.customerName,
    customer: [order.customerName, phone].filter(Boolean).join(" · "),
    items: formatItemLines(messageItems(items)).join("\n"),
    subtotal: formatMoney(subtotal),
    deliveryFee: feeText,
    total: order.deliveryFeeConfirmed ? formatMoney(total) : `${formatMoney(total)} + delivery`,
    amountDue: formatMoney(due),
    payment: paymentText,
    fulfilment: fulfilmentText,
    fulfilmentBlock,
    totalsBlock,
    area,
    street: order.shippingAddress ?? "",
    mapUrl: pin ?? "",
    address: [order.deliveryArea, order.shippingAddress, order.gpsAddress, pin].filter(Boolean).join(", "),
    window: order.deliveryWindow ?? "",
    gift: giftFor ? `Yes, for ${giftFor}` : "",
    giftFor,
    note: order.notes ?? "",
    link: orderLink(order.publicToken ?? ""),
    invoiceLink: invoiceLink(order.publicToken ?? ""),
    code: order.deliveryCode ?? "",
    pickupLocation: order.pickupLocationName ?? "",
    hours: contact.businessHours,
    reason: "",
    ...extra,
  };
}

/** The prefilled message the customer sends to the business. */
export async function customerHandoffMessage(order: OrderRow, items: OrderItemRow[]): Promise<string> {
  const [whatsapp, vars] = await Promise.all([getSettings("whatsapp"), templateVars(order, items)]);
  const { items: _ignored, ...rest } = vars;
  void _ignored;
  return buildOrderMessage(whatsapp.orderMessage, rest, messageItems(items));
}

/** Fill a staff template (one-tap replies). */
export async function staffMessage(
  template: string,
  order: OrderRow,
  items: OrderItemRow[],
  extra: MessageVars = {},
): Promise<string> {
  const vars = await templateVars(order, items, extra);
  const { brand } = await getPublicSettings();
  return fillBrand(fillTemplateCompact(template, vars), brand.name);
}
