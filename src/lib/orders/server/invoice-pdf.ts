import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { jsPDF } from "jspdf";

import type { orderItemTable, storeOrderTable } from "@/db/schema";
import { parsePrice } from "@/lib/format";
import { getPublicSettings, getSettings } from "@/lib/settings/get";

import { formatMoney } from "../money";
import { formatLocalPhone } from "../phone";
import { isOrderStatus, PAYMENT_STATUS_LABELS, isPaymentStatus } from "../status";

type OrderRow = typeof storeOrderTable.$inferSelect;
type ItemRow = typeof orderItemTable.$inferSelect;

const BRAND_GREEN: [number, number, number] = [45, 106, 79];
const INK: [number, number, number] = [20, 20, 20];
const MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [225, 225, 225];

/** Logo as a PNG data URL (jsPDF can't read webp/svg). Never throws. */
async function loadLogo(url: string): Promise<{ data: string; w: number; h: number } | null> {
  if (!url) return null;
  try {
    let buf: Buffer;
    if (/^https?:\/\//.test(url)) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
      if (!res.ok) return null;
      buf = Buffer.from(await res.arrayBuffer());
    } else if (url.startsWith("/") && !url.startsWith("/api/")) {
      const file = path.join(process.cwd(), "public", path.normalize(url).replace(/^([/\\])+/, ""));
      if (!file.startsWith(path.join(process.cwd(), "public"))) return null;
      buf = await readFile(file);
    } else {
      return null;
    }
    const sharp = (await import("sharp")).default;
    const png = await sharp(buf).resize({ width: 240, height: 240, fit: "inside" }).png().toBuffer({ resolveWithObject: true });
    return { data: `data:image/png;base64,${png.data.toString("base64")}`, w: png.info.width, h: png.info.height };
  } catch {
    return null;
  }
}

export function invoiceFileName(order: Pick<OrderRow, "orderNumber">) {
  return `Invoice-${order.orderNumber}.pdf`;
}

/**
 * The order's invoice as a PDF, laid out like the manual invoice generator.
 * Before confirmation it's a PRO-FORMA (prices/fee may still change);
 * cancelled/expired orders are stamped so an old file can't pass as current.
 */
export async function buildOrderInvoicePdf(order: OrderRow, items: ItemRow[]): Promise<Buffer> {
  const [{ brand, contact }, payments] = await Promise.all([getPublicSettings(), getSettings("payments")]);
  const logo = await loadLogo(brand.logoUrl);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  let y = M;

  const status = isOrderStatus(order.status) ? order.status : "confirmed";
  const voided = status === "cancelled" || status === "expired" || status === "returned";
  const proforma = !order.confirmedAt && !voided;
  const title = proforma ? "PRO-FORMA INVOICE" : "INVOICE";

  const text = (s: string, x: number, yy: number, opts: { size?: number; bold?: boolean; color?: [number, number, number]; align?: "left" | "right" | "center"; maxWidth?: number } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(...(opts.color ?? INK));
    doc.text(s, x, yy, { align: opts.align ?? "left", maxWidth: opts.maxWidth });
  };
  const wrap = (s: string, width: number, size = 10) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(s, width) as string[];
  };
  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  // ── Header: logo + seller (left), title + meta (right) ──
  let leftX = M;
  if (logo) {
    const size = 56;
    const scale = Math.min(size / logo.w, size / logo.h);
    doc.addImage(logo.data, "PNG", M, y, logo.w * scale, logo.h * scale);
    leftX = M + size + 12;
  }
  text(brand.legalName || brand.name, leftX, y + 12, { size: 14, bold: true });
  const sellerLines = [
    payments.invoiceAddress,
    contact.orderPhone ? formatLocalPhone(contact.orderPhone) || contact.orderPhone : "",
    contact.emailOrders || contact.emailHello,
    payments.invoiceTaxId ? `TIN: ${payments.invoiceTaxId}` : "",
  ].filter(Boolean);
  let sy = y + 28;
  for (const line of sellerLines) {
    for (const l of wrap(line, 230, 9)) {
      text(l, leftX, sy, { size: 9, color: MUTED });
      sy += 12;
    }
  }

  text(title, W - M, y + 14, { size: proforma ? 15 : 20, bold: true, color: BRAND_GREEN, align: "right" });
  const date = order.confirmedAt ?? order.createdAt;
  const meta = [
    order.orderNumber,
    `Date: ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
    `Payment: ${isPaymentStatus(order.paymentStatus) ? PAYMENT_STATUS_LABELS[order.paymentStatus] : order.paymentStatus}`,
  ];
  let my = y + 34;
  meta.forEach((m, i) => {
    text(m, W - M, my, { size: i === 0 ? 11 : 9, bold: i === 0, color: i === 0 ? INK : MUTED, align: "right" });
    my += 14;
  });

  y = Math.max(sy, my, y + 70) + 14;
  doc.setDrawColor(...LINE);
  doc.line(M, y, W - M, y);
  y += 22;

  // ── Bill to / deliver to ──
  text("BILL TO", M, y, { size: 8, bold: true, color: MUTED });
  text(order.fulfilment === "pickup" ? "PICKUP" : "DELIVER TO", W / 2, y, { size: 8, bold: true, color: MUTED });
  y += 14;
  const billLines = [
    order.customerName,
    order.customerPhoneE164 ? formatLocalPhone(order.customerPhoneE164) : order.customerPhone ?? "",
    order.customerEmail ?? "",
  ].filter(Boolean);
  const shipLines =
    order.fulfilment === "pickup"
      ? [order.pickupLocationName ?? ""]
      : [
          order.isGift && order.recipientName ? `${order.recipientName} (gift)` : "",
          [order.deliveryArea, order.shippingAddress].filter(Boolean).join(", "),
          order.gpsAddress ? `GPS: ${order.gpsAddress}` : "",
          order.deliveryWindow ? `Time: ${order.deliveryWindow}` : "",
        ].filter(Boolean);
  let by = y;
  billLines.forEach((l, i) => {
    text(l, M, by, { size: i === 0 ? 11 : 10, bold: i === 0 });
    by += 14;
  });
  let dy = y;
  for (const l of shipLines) {
    for (const w of wrap(l, W / 2 - M, 10)) {
      text(w, W / 2, dy, { size: 10 });
      dy += 14;
    }
  }
  y = Math.max(by, dy) + 16;

  // ── Items table ──
  const col = { item: M, qty: W - M - 190, price: W - M - 95, total: W - M };
  doc.setDrawColor(...BRAND_GREEN);
  doc.setLineWidth(1.5);
  text("Item", col.item, y, { size: 9, bold: true });
  text("Qty", col.qty, y, { size: 9, bold: true, align: "right" });
  text("Price", col.price, y, { size: 9, bold: true, align: "right" });
  text("Total", col.total, y, { size: 9, bold: true, align: "right" });
  y += 8;
  doc.line(M, y, W - M, y);
  doc.setLineWidth(0.5);
  doc.setDrawColor(...LINE);
  y += 16;
  for (const it of items) {
    const lines = wrap(it.productName, col.qty - col.item - 40, 10);
    ensure(lines.length * 13 + 14);
    lines.forEach((l, i) => text(l, col.item, y + i * 13, { size: 10 }));
    const price = parsePrice(it.price);
    text(String(it.quantity), col.qty, y, { size: 10, align: "right" });
    text(formatMoney(price), col.price, y, { size: 10, align: "right" });
    text(formatMoney(price * it.quantity), col.total, y, { size: 10, bold: true, align: "right" });
    y += lines.length * 13 + 6;
    doc.line(M, y, W - M, y);
    y += 16;
  }

  // ── Totals ──
  ensure(120);
  const subtotal = parsePrice(order.subtotal);
  const fee = parsePrice(order.shipping);
  const total = parsePrice(order.total);
  const paid = parsePrice(order.amountPaid);
  const due = Math.max(0, total - paid);
  const rows: [string, string, boolean?][] = [["Subtotal", formatMoney(subtotal)]];
  if (order.fulfilment === "delivery") {
    rows.push([
      `Delivery${order.deliveryArea ? ` (${order.deliveryArea})` : ""}`,
      order.deliveryFeeConfirmed ? (fee > 0 ? formatMoney(fee) : "Free") : "To be confirmed",
    ]);
  }
  rows.push(["Total", formatMoney(total) + (order.deliveryFeeConfirmed ? "" : " + delivery"), true]);
  if (paid > 0) rows.push(["Paid", `-${formatMoney(paid)}`]);
  if (!voided) rows.push(["Balance due", formatMoney(due), true]);
  const labelX = W - M - 210;
  for (const [label, value, strong] of rows) {
    if (strong) {
      doc.setDrawColor(...LINE);
      doc.line(labelX, y - 11, W - M, y - 11);
    }
    text(label, labelX, y, { size: strong ? 11 : 10, bold: strong, color: strong ? INK : MUTED });
    text(value, W - M, y, { size: strong ? 11 : 10, bold: strong, align: "right", color: strong && label === "Balance due" && due > 0 ? BRAND_GREEN : INK });
    y += 18;
  }
  y += 10;

  // ── How to pay ──
  const bank = [
    payments.bankName && `Bank: ${payments.bankName}`,
    payments.bankAccountName && `Account name: ${payments.bankAccountName}`,
    payments.bankAccountNumber && `Account number: ${payments.bankAccountNumber}`,
    payments.bankBranch && `Branch: ${payments.bankBranch}`,
  ].filter(Boolean) as string[];
  const momo = [
    payments.momoProvider && `Provider: ${payments.momoProvider}`,
    payments.momoMerchantName && `Name: ${payments.momoMerchantName}`,
    payments.momoMerchantId && `Merchant ID / number: ${payments.momoMerchantId}`,
    payments.momoContactLine && `Contact: ${payments.momoContactLine}`,
  ].filter(Boolean) as string[];
  if (!voided && due > 0 && (bank.length || momo.length)) {
    ensure(40 + Math.max(bank.length, momo.length) * 13);
    text("HOW TO PAY", M, y, { size: 8, bold: true, color: MUTED });
    text(`Use ${order.orderNumber} as the payment reference.`, W - M, y, { size: 8, color: MUTED, align: "right" });
    y += 16;
    const startY = y;
    if (momo.length) {
      text("Mobile Money", M, y, { size: 10, bold: true });
      momo.forEach((l, i) => text(l, M, y + 14 + i * 13, { size: 9, color: MUTED }));
    }
    if (bank.length) {
      const x = momo.length ? W / 2 : M;
      text("Bank transfer", x, startY, { size: 10, bold: true });
      bank.forEach((l, i) => text(l, x, startY + 14 + i * 13, { size: 9, color: MUTED }));
    }
    y = startY + 18 + Math.max(bank.length, momo.length) * 13 + 10;
  }

  // ── Notes ──
  const notes = [order.notes ? `Customer note: ${order.notes}` : "", payments.invoiceNotes].filter(Boolean);
  for (const n of notes) {
    const lines = wrap(n, W - 2 * M, 9);
    ensure(lines.length * 12 + 8);
    lines.forEach((l, i) => text(l, M, y + i * 12, { size: 9, color: MUTED }));
    y += lines.length * 12 + 8;
  }
  if (proforma) {
    ensure(20);
    text("Pro-forma: prices and delivery fee are confirmed by us on WhatsApp before you pay.", M, y + 4, { size: 8, color: MUTED });
  }

  // ── Stamp + footer on every page ──
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (voided) {
      doc.saveGraphicsState();
      doc.setGState(doc.GState({ opacity: 0.15 }));
      text(status.toUpperCase(), W / 2, H * 0.62, { size: 80, bold: true, color: [200, 30, 30], align: "center" });
      doc.restoreGraphicsState();
    } else if (order.paymentStatus === "paid") {
      doc.saveGraphicsState();
      doc.setGState(doc.GState({ opacity: 0.12 }));
      text("PAID", W / 2, H * 0.62, { size: 110, bold: true, color: BRAND_GREEN, align: "center" });
      doc.restoreGraphicsState();
    }
    text(`Thank you for choosing ${brand.name}.`, M, H - 28, { size: 8, color: MUTED });
    text(`${order.orderNumber} · page ${p} of ${pages}`, W - M, H - 28, { size: 8, color: MUTED, align: "right" });
  }

  return Buffer.from(doc.output("arraybuffer"));
}
