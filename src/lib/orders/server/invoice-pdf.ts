import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { get } from "@vercel/blob";
import { jsPDF } from "jspdf";

import type { orderItemTable, storeOrderTable } from "@/db/schema";
import { decodeProxyParam } from "@/lib/blob-url";
import { parsePrice } from "@/lib/format";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { brandLogos } from "@/lib/settings/schemas";

import { formatMoney } from "../money";
import { formatLocalPhone } from "../phone";
import { isOrderStatus, PAYMENT_STATUS_LABELS, isPaymentStatus } from "../status";

type OrderRow = typeof storeOrderTable.$inferSelect;
type ItemRow = typeof orderItemTable.$inferSelect;

const BRAND_GREEN: [number, number, number] = [45, 106, 79];
const INK: [number, number, number] = [20, 20, 20];
const MUTED: [number, number, number] = [110, 110, 110];
const LINE: [number, number, number] = [225, 225, 225];

type LoadedImage = { data: string; w: number; h: number };

const withTimeout = <T,>(p: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(resolve, reject).finally(() => clearTimeout(t));
  });

/** Raw bytes for a /api/media proxy URL, /public path or http(s) URL. */
async function fetchImageBytes(url: string): Promise<Buffer | null> {
  const proxy = url.match(/^(?:https?:\/\/[^/]+)?\/api\/media\?(.*)$/);
  if (proxy) {
    const u = new URLSearchParams(proxy[1]).get("u");
    const blobUrl = u ? decodeProxyParam(u) : null;
    if (!blobUrl) return null;
    const res = await get(blobUrl, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!res || res.statusCode !== 200) return null;
    return Buffer.from(await new Response(res.stream).arrayBuffer());
  }
  if (/^https?:\/\//.test(url)) {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  if (url.startsWith("/") && !url.startsWith("/api/")) {
    const root = path.join(process.cwd(), "public");
    const file = path.join(root, path.normalize(url).replace(/^([/\\])+/, ""));
    if (!file.startsWith(root)) return null;
    return readFile(file);
  }
  return null;
}

/** Image resized + re-encoded for jsPDF (it can't read webp/svg). Never throws. */
async function loadImage(url: string | null | undefined, maxPx: number, format: "PNG" | "JPEG"): Promise<LoadedImage | null> {
  if (!url) return null;
  try {
    const buf = await withTimeout(fetchImageBytes(url), 4000);
    if (!buf) return null;
    const sharp = (await import("sharp")).default;
    let img = sharp(buf).resize({ width: maxPx, height: maxPx, fit: "inside" });
    img = format === "PNG" ? img.png() : img.flatten({ background: "#ffffff" }).jpeg({ quality: 80 });
    const out = await img.toBuffer({ resolveWithObject: true });
    const mime = format === "PNG" ? "image/png" : "image/jpeg";
    return { data: `data:${mime};base64,${out.data.toString("base64")}`, w: out.info.width, h: out.info.height };
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
  return renderOrderInvoicePdf(order, items, { brand, contact, payments });
}

type PublicSettings = Awaited<ReturnType<typeof getPublicSettings>>;
type RenderSettings = {
  brand: PublicSettings["brand"];
  contact: PublicSettings["contact"];
  payments: Awaited<ReturnType<typeof getSettings<"payments">>>;
};

/** Pure drawing, given explicit settings (also lets the layout be exercised without a DB). */
export async function renderOrderInvoicePdf(order: OrderRow, items: ItemRow[], settings: RenderSettings): Promise<Buffer> {
  const { brand, contact, payments } = settings;
  // Logo + every distinct item image, in parallel.
  const uniqueImages = [...new Set(items.map((i) => i.image).filter((u): u is string => !!u))];
  const [logo, ...thumbList] = await Promise.all([
    loadImage(brandLogos(brand).light, 240, "PNG"),
    ...uniqueImages.map((u) => loadImage(u, 96, "JPEG")),
  ]);
  const thumbs = new Map(uniqueImages.map((u, i) => [u, thumbList[i]]));

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 44;
  let y = M;

  const status = isOrderStatus(order.status) ? order.status : "confirmed";
  const voided = status === "cancelled" || status === "expired" || status === "returned";
  const proforma = !order.confirmedAt && !voided;
  const title = proforma ? "PRO-FORMA INVOICE" : "INVOICE";

  type Opts = { size?: number; bold?: boolean; color?: [number, number, number]; align?: "left" | "right" | "center" };
  const setFont = (o: Opts) => {
    doc.setFont("helvetica", o.bold ? "bold" : "normal");
    doc.setFontSize(o.size ?? 10);
  };
  const text = (s: string, x: number, yy: number, opts: Opts = {}) => {
    setFont(opts);
    doc.setTextColor(...(opts.color ?? INK));
    doc.text(s, x, yy, { align: opts.align ?? "left" });
  };
  /** Wrap with the right font set first; unbroken tokens wider than `width` are chunked. */
  const wrap = (s: string, width: number, o: Opts = {}) => {
    setFont(o);
    const parts = s.split(/\s+/).flatMap((tok) => {
      if (doc.getTextWidth(tok) <= width) return [tok];
      const chunks: string[] = [];
      let cur = "";
      for (const ch of tok) {
        if (cur && doc.getTextWidth(cur + ch) > width) {
          chunks.push(cur);
          cur = ch;
        } else cur += ch;
      }
      if (cur) chunks.push(cur);
      return chunks;
    });
    return doc.splitTextToSize(parts.join(" "), width) as string[];
  };
  /** Set font, wrap, draw; returns the y after the last line. `yy` is the first baseline. */
  const line = (s: string, x: number, yy: number, width: number, o: Opts & { lh?: number } = {}) => {
    const lh = o.lh ?? Math.round((o.size ?? 10) * 1.4);
    for (const l of wrap(s, width, o)) {
      text(l, x, yy, o);
      yy += lh;
    }
    return yy;
  };
  const ensure = (needed: number) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
      return true;
    }
    return false;
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
  for (const l of sellerLines) sy = line(l, leftX, sy, 230, { size: 9, color: MUTED, lh: 12 });

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

  // ── Bill to / deliver to: two fixed columns with a gutter ──
  const colW = (W - 2 * M - 24) / 2;
  const shipX = M + colW + 24;
  text("BILL TO", M, y, { size: 8, bold: true, color: MUTED });
  text(order.fulfilment === "pickup" ? "PICKUP" : "DELIVER TO", shipX, y, { size: 8, bold: true, color: MUTED });
  y += 14;
  const billLines = [
    order.customerName,
    order.customerPhoneE164 ? formatLocalPhone(order.customerPhoneE164) : order.customerPhone ?? "",
    order.customerEmail ?? "",
  ].filter(Boolean);
  let by = y;
  billLines.forEach((l, i) => {
    by = line(l, M, by, colW, { size: i === 0 ? 11 : 10, bold: i === 0, lh: 14 });
  });

  const shipRows: [string, string][] =
    order.fulfilment === "pickup"
      ? [["Location", order.pickupLocationName ?? ""]]
      : [
          ["Area", order.deliveryArea ?? ""],
          ["Address", order.shippingAddress ?? ""],
          ["GPS", order.gpsAddress ?? ""],
          ["Time", order.deliveryWindow ?? ""],
          ["Gift for", order.isGift ? order.recipientName ?? "" : ""],
        ];
  const labelW = 52;
  let dy = y;
  for (const [label, value] of shipRows) {
    if (!value.trim()) continue;
    text(label, shipX, dy, { size: 9, color: MUTED });
    dy = line(value, shipX + labelW, dy, colW - labelW, { size: 10, lh: 14 });
  }
  y = Math.max(by, dy) + 16;

  // ── Items table ──
  const col = { item: M, qty: W - M - 190, price: W - M - 95, total: W - M };
  const THUMB = 40;
  const textX = M + THUMB + 10;
  const nameW = col.qty - 34 - textX;
  const drawItemsHeader = () => {
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
    y += 12;
  };
  drawItemsHeader();
  for (const it of items) {
    const nameLines = wrap(it.productName, nameW, { size: 10 });
    const skuLines = it.sku ? wrap(`SKU: ${it.sku}`, nameW, { size: 8 }) : [];
    const textH = nameLines.length * 13 + skuLines.length * 11;
    const rowH = Math.max(THUMB, textH);
    if (ensure(rowH + 14)) drawItemsHeader();

    const thumb = it.image ? thumbs.get(it.image) : null;
    if (thumb) {
      const sc = Math.min(THUMB / thumb.w, THUMB / thumb.h);
      const w = thumb.w * sc;
      const h = thumb.h * sc;
      doc.addImage(thumb.data, "JPEG", M + (THUMB - w) / 2, y + (THUMB - h) / 2, w, h);
    } else {
      doc.setFillColor(238, 238, 238);
      doc.roundedRect(M, y, THUMB, THUMB, 4, 4, "F");
    }
    const ty = line(it.productName, textX, y + 10, nameW, { size: 10, lh: 13 });
    if (it.sku) line(`SKU: ${it.sku}`, textX, ty - 1, nameW, { size: 8, color: MUTED, lh: 11 });
    const price = parsePrice(it.price);
    text(String(it.quantity), col.qty, y + 10, { size: 10, align: "right" });
    text(formatMoney(price), col.price, y + 10, { size: 10, align: "right" });
    text(formatMoney(price * it.quantity), col.total, y + 10, { size: 10, bold: true, align: "right" });
    y += rowH + 6;
    doc.line(M, y, W - M, y);
    y += 12;
  }
  y += 6;

  // ── Totals ──
  const subtotal = parsePrice(order.subtotal);
  const fee = parsePrice(order.shipping);
  const total = parsePrice(order.total);
  const paid = parsePrice(order.amountPaid);
  const due = Math.max(0, total - paid);
  type TotalRow = { label: string; value: string; strong?: boolean; sub?: string };
  const rows: TotalRow[] = [{ label: "Subtotal", value: formatMoney(subtotal) }];
  if (order.fulfilment === "delivery") {
    rows.push({
      label: "Delivery",
      sub: order.deliveryArea ?? undefined,
      value: order.deliveryFeeConfirmed ? (fee > 0 ? formatMoney(fee) : "Free") : "To be confirmed",
    });
  }
  rows.push({ label: "Total", value: formatMoney(total), strong: true, sub: order.deliveryFeeConfirmed ? undefined : "+ delivery fee" });
  if (paid > 0) rows.push({ label: "Paid", value: `-${formatMoney(paid)}` });
  if (!voided) rows.push({ label: "Balance due", value: formatMoney(due), strong: true });
  const labelX = W - M - 210;
  const labelColW = 210 - 90 - 8;
  ensure(30);
  for (const r of rows) {
    const size = r.strong ? 11 : 10;
    const subLines = r.sub ? wrap(r.sub, labelColW, { size: 8 }) : [];
    ensure(18 + subLines.length * 11);
    if (r.strong) {
      doc.setDrawColor(...LINE);
      doc.line(labelX, y - 12, W - M, y - 12);
    }
    let ly = line(r.label, labelX, y, labelColW, { size, bold: r.strong, color: r.strong ? INK : MUTED });
    if (r.sub) ly = line(r.sub, labelX, ly - 2, labelColW, { size: 8, color: MUTED, lh: 11 });
    text(r.value, W - M, y, { size, bold: r.strong, align: "right", color: r.strong && r.label === "Balance due" && due > 0 ? BRAND_GREEN : INK });
    y = Math.max(y + 18, ly + 6);
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
    const lines = wrap(n, W - 2 * M, { size: 9 });
    ensure(lines.length * 12 + 8);
    y = line(n, M, y, W - 2 * M, { size: 9, color: MUTED, lh: 12 }) + 8;
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
