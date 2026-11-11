import "server-only";

import { asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  adminUserTable,
  categoryTable,
  inventoryTable,
  inventoryTransactionTable,
  invoiceItemTable,
  invoiceTable,
  orderItemTable,
  productTable,
  storeOrderTable as o,
  userTable,
} from "@/db/schema";
import type { AdminPermissions } from "@/db/schema";
import { businessAnalytics, parseRange } from "@/lib/analytics/server";
import { formatLocalPhone } from "@/lib/orders/phone";
import { CANCEL_REASON_LABELS, isOrderStatus, isPaymentStatus, PAYMENT_STATUS_LABELS, STATUS_LABELS } from "@/lib/orders/status";
import { PAYMENT_METHOD_LABELS } from "@/lib/orders/server/view";

import { type AnySheet, sheet } from "./xlsx";

export type ExportOptions = { days: number | null };

type Dataset = {
  label: string;
  permission: keyof AdminPermissions;
  sheets: (opts: ExportOptions) => Promise<AnySheet[]>;
};

const phone = (e164: string | null, raw?: string | null) => (e164 ? formatLocalPhone(e164) : raw ?? "");
const payLabel = (m: string | null) => (m ? PAYMENT_METHOD_LABELS[m as keyof typeof PAYMENT_METHOD_LABELS] ?? m : "");
const statusLabel = (s: string) => (isOrderStatus(s) ? STATUS_LABELS[s] : s);
const payStatusLabel = (s: string) => (isPaymentStatus(s) ? PAYMENT_STATUS_LABELS[s] : s);
const since = (days: number | null) => (days ? new Date(Date.now() - days * 86_400_000) : null);

/* ───────────── products & inventory ───────────── */

async function productSheets(): Promise<AnySheet[]> {
  const rows = await db
    .select({
      name: productTable.name,
      sku: productTable.sku,
      barcode: productTable.barcode,
      category: categoryTable.name,
      price: productTable.price,
      originalPrice: productTable.originalPrice,
      customerPrice: productTable.customerPrice,
      retailPrice: productTable.retailPrice,
      wholesalePrice: productTable.wholesalePrice,
      wholesalePrice2: productTable.wholesalePrice2,
      distributorPrice: productTable.distributorPrice,
      inStock: inventoryTable.quantityInStock,
      reserved: inventoryTable.quantityReserved,
      available: inventoryTable.quantityAvailable,
      lowStockThreshold: inventoryTable.lowStockThreshold,
      reorderPoint: inventoryTable.reorderPoint,
      reorderQuantity: inventoryTable.reorderQuantity,
      lastRestocked: inventoryTable.lastRestocked,
      isActive: productTable.isActive,
      isFeatured: productTable.isFeatured,
      manufacturer: productTable.manufacturer,
      batchNumber: productTable.batchNumber,
      expiryDate: productTable.expiryDate,
      slug: productTable.slug,
      createdAt: productTable.createdAt,
      updatedAt: productTable.updatedAt,
    })
    .from(productTable)
    .leftJoin(categoryTable, eq(categoryTable.id, productTable.categoryId))
    .leftJoin(inventoryTable, eq(inventoryTable.productId, productTable.id))
    .orderBy(asc(categoryTable.sortOrder), asc(productTable.name));

  const stockValue = (r: (typeof rows)[number]) => Math.max(0, r.available ?? 0) * Number(r.price);
  const status = (r: (typeof rows)[number]) =>
    r.available === null ? "Not tracked" : r.available <= 0 ? "Out of stock" : r.available <= r.lowStockThreshold! ? "Low stock" : "In stock";

  return [
    sheet("Inventory", rows, [
      { header: "Product", value: (r) => r.name.trim(), width: 32 },
      { header: "SKU", value: (r) => r.sku, width: 16 },
      { header: "Category", value: (r) => r.category ?? "", width: 20 },
      { header: "Price (GHS)", value: (r) => r.price, type: "money" },
      { header: "In stock", value: (r) => r.inStock, type: "int" },
      { header: "Reserved", value: (r) => r.reserved, type: "int" },
      { header: "Available", value: (r) => r.available, type: "int" },
      { header: "Stock status", value: status, width: 14 },
      { header: "Stock value (GHS)", value: stockValue, type: "money", width: 18 },
      { header: "Low-stock alert at", value: (r) => r.lowStockThreshold, type: "int", width: 18 },
      { header: "Reorder point", value: (r) => r.reorderPoint, type: "int" },
      { header: "Reorder qty", value: (r) => r.reorderQuantity, type: "int" },
      { header: "Last restocked", value: (r) => r.lastRestocked, type: "date", width: 16 },
      { header: "Active on site", value: (r) => r.isActive, type: "bool" },
    ]),
    sheet("Products & prices", rows, [
      { header: "Product", value: (r) => r.name.trim(), width: 32 },
      { header: "SKU", value: (r) => r.sku, width: 16 },
      { header: "Barcode", value: (r) => r.barcode ?? "", width: 16 },
      { header: "Category", value: (r) => r.category ?? "", width: 20 },
      { header: "Site price", value: (r) => r.price, type: "money" },
      { header: "Was price", value: (r) => r.originalPrice, type: "money" },
      { header: "Customer price", value: (r) => r.customerPrice, type: "money", width: 15 },
      { header: "Retail price", value: (r) => r.retailPrice, type: "money" },
      { header: "Wholesale price", value: (r) => r.wholesalePrice, type: "money", width: 16 },
      { header: "Wholesale price 2", value: (r) => r.wholesalePrice2, type: "money", width: 17 },
      { header: "Distributor price", value: (r) => r.distributorPrice, type: "money", width: 17 },
      { header: "Manufacturer", value: (r) => r.manufacturer ?? "", width: 18 },
      { header: "Batch", value: (r) => r.batchNumber ?? "" },
      { header: "Expiry", value: (r) => r.expiryDate, type: "date" },
      { header: "Active", value: (r) => r.isActive, type: "bool" },
      { header: "Featured", value: (r) => r.isFeatured, type: "bool" },
      { header: "Page", value: (r) => `/shop/${r.slug}`, width: 30 },
      { header: "Created", value: (r) => r.createdAt, type: "date" },
      { header: "Last updated", value: (r) => r.updatedAt, type: "datetime", width: 18 },
    ]),
  ];
}

async function stockMovementSheet(opts: ExportOptions): Promise<AnySheet> {
  const from = since(opts.days);
  const rows = await db
    .select({
      at: inventoryTransactionTable.createdAt,
      product: productTable.name,
      sku: productTable.sku,
      type: inventoryTransactionTable.type,
      quantity: inventoryTransactionTable.quantity,
      reason: inventoryTransactionTable.reason,
      reference: inventoryTransactionTable.reference,
      notes: inventoryTransactionTable.notes,
      by: userTable.name,
    })
    .from(inventoryTransactionTable)
    .leftJoin(productTable, eq(productTable.id, inventoryTransactionTable.productId))
    .leftJoin(adminUserTable, eq(adminUserTable.id, inventoryTransactionTable.performedBy))
    .leftJoin(userTable, eq(userTable.id, adminUserTable.userId))
    .where(from ? gte(inventoryTransactionTable.createdAt, from) : undefined)
    .orderBy(desc(inventoryTransactionTable.createdAt));
  return sheet("Stock movements", rows, [
    { header: "Date", value: (r) => r.at, type: "datetime", width: 18 },
    { header: "Product", value: (r) => r.product?.trim() ?? "(deleted)", width: 30 },
    { header: "SKU", value: (r) => r.sku ?? "", width: 16 },
    { header: "Type", value: (r) => r.type },
    { header: "Quantity", value: (r) => r.quantity, type: "int" },
    { header: "Reason", value: (r) => r.reason, width: 14 },
    { header: "Reference", value: (r) => r.reference ?? "", width: 18 },
    { header: "Notes", value: (r) => r.notes ?? "", width: 30 },
    { header: "By", value: (r) => r.by ?? "", width: 18 },
  ]);
}

/* ───────────── categories ───────────── */

async function categorySheets(): Promise<AnySheet[]> {
  const rows = await db
    .select({
      name: categoryTable.name,
      slug: categoryTable.slug,
      description: categoryTable.description,
      isActive: categoryTable.isActive,
      sortOrder: categoryTable.sortOrder,
      products: sql<number>`count(${productTable.id})::int`,
      activeProducts: sql<number>`count(${productTable.id}) filter (where ${productTable.isActive})::int`,
      units: sql<number>`coalesce(sum(greatest(${inventoryTable.quantityAvailable}, 0)), 0)::int`,
      stockValue: sql<string>`coalesce(sum(greatest(${inventoryTable.quantityAvailable}, 0) * ${productTable.price}), 0)`,
      createdAt: categoryTable.createdAt,
    })
    .from(categoryTable)
    .leftJoin(productTable, eq(productTable.categoryId, categoryTable.id))
    .leftJoin(inventoryTable, eq(inventoryTable.productId, productTable.id))
    .groupBy(categoryTable.id)
    .orderBy(asc(categoryTable.sortOrder), asc(categoryTable.name));
  return [
    sheet("Categories", rows, [
      { header: "Category", value: (r) => r.name, width: 24 },
      { header: "Products", value: (r) => r.products, type: "int" },
      { header: "Active products", value: (r) => r.activeProducts, type: "int", width: 15 },
      { header: "Units available", value: (r) => r.units, type: "int", width: 15 },
      { header: "Stock value (GHS)", value: (r) => r.stockValue, type: "money", width: 18 },
      { header: "Shown on site", value: (r) => r.isActive, type: "bool" },
      { header: "Sort order", value: (r) => r.sortOrder, type: "int" },
      { header: "Description", value: (r) => r.description ?? "", width: 40 },
      { header: "Page", value: (r) => `/shop?category=${r.slug}`, width: 30 },
      { header: "Created", value: (r) => r.createdAt, type: "date" },
    ]),
  ];
}

/* ───────────── customers ───────────── */

async function customerSheets(): Promise<AnySheet[]> {
  const [buyers, accounts] = await Promise.all([
    db
      .select({
        phone: o.customerPhoneE164,
        name: sql<string>`(array_agg(${o.customerName} order by ${o.createdAt} desc))[1]`,
        email: sql<string | null>`max(${o.customerEmail})`,
        orders: sql<number>`count(*)::int`,
        confirmed: sql<number>`count(*) filter (where ${o.confirmedAt} is not null and ${o.status} not in ('cancelled','returned'))::int`,
        spent: sql<string>`coalesce(sum(${o.total}) filter (where ${o.confirmedAt} is not null and ${o.status} not in ('cancelled','returned')), 0)`,
        paid: sql<string>`coalesce(sum(${o.amountPaid}), 0)`,
        firstOrder: sql<Date>`min(${o.createdAt})`,
        lastOrder: sql<Date>`max(${o.createdAt})`,
        lastArea: sql<string | null>`(array_agg(${o.deliveryArea} order by ${o.createdAt} desc) filter (where ${o.deliveryArea} is not null))[1]`,
      })
      .from(o)
      .where(sql`${o.customerPhoneE164} is not null`)
      .groupBy(o.customerPhoneE164)
      .orderBy(sql`max(${o.createdAt}) desc`),
    db
      .select({
        name: userTable.name,
        email: userTable.email,
        phone: userTable.phone,
        region: userTable.deliveryRegion,
        location: userTable.deliveryLocation,
        landmark: userTable.deliveryLandmark,
        verified: userTable.emailVerified,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .orderBy(desc(userTable.createdAt)),
  ]);
  return [
    sheet(
      "WhatsApp customers",
      buyers,
      [
        { header: "Name", value: (r) => r.name, width: 24 },
        { header: "Phone", value: (r) => phone(r.phone), width: 16 },
        { header: "Email", value: (r) => r.email ?? "", width: 26 },
        { header: "Orders placed", value: (r) => r.orders, type: "int", width: 14 },
        { header: "Orders confirmed", value: (r) => r.confirmed, type: "int", width: 16 },
        { header: "Total spent (GHS)", value: (r) => r.spent, type: "money", width: 18 },
        { header: "Total paid (GHS)", value: (r) => r.paid, type: "money", width: 17 },
        { header: "First order", value: (r) => r.firstOrder, type: "date", width: 14 },
        { header: "Last order", value: (r) => r.lastOrder, type: "date", width: 14 },
        { header: "Last delivery area", value: (r) => r.lastArea ?? "", width: 20 },
      ],
      "One row per phone number that has ordered on the website. Spent counts confirmed orders only.",
    ),
    sheet("Registered accounts", accounts, [
      { header: "Name", value: (r) => r.name, width: 24 },
      { header: "Email", value: (r) => r.email, width: 28 },
      { header: "Phone", value: (r) => r.phone ?? "", width: 16 },
      { header: "Region", value: (r) => r.region ?? "", width: 16 },
      { header: "Location", value: (r) => r.location ?? "", width: 24 },
      { header: "Landmark", value: (r) => r.landmark ?? "", width: 24 },
      { header: "Email verified", value: (r) => r.verified, type: "bool", width: 14 },
      { header: "Signed up", value: (r) => r.createdAt, type: "date" },
    ]),
  ];
}

/* ───────────── orders ───────────── */

async function orderSheets(opts: ExportOptions): Promise<AnySheet[]> {
  const from = since(opts.days);
  const orders = await db
    .select()
    .from(o)
    .where(from ? gte(o.createdAt, from) : undefined)
    .orderBy(desc(o.createdAt));
  const ids = orders.map((r) => r.id);
  const items = ids.length
    ? await db.select().from(orderItemTable).where(inArray(orderItemTable.orderId, ids))
    : [];
  const numberById = new Map(orders.map((r) => [r.id, r]));

  return [
    sheet("Orders", orders, [
      { header: "Order #", value: (r) => r.orderNumber, width: 16 },
      { header: "Placed", value: (r) => r.createdAt, type: "datetime", width: 18 },
      { header: "Status", value: (r) => statusLabel(r.status), width: 18 },
      { header: "Customer", value: (r) => r.customerName, width: 22 },
      { header: "Phone", value: (r) => phone(r.customerPhoneE164, r.customerPhone), width: 16 },
      { header: "Email", value: (r) => r.customerEmail ?? "", width: 24 },
      { header: "Fulfilment", value: (r) => (r.fulfilment === "pickup" ? "Pickup" : "Delivery") },
      { header: "Area / pickup point", value: (r) => (r.fulfilment === "pickup" ? r.pickupLocationName : r.deliveryArea) ?? "", width: 20 },
      { header: "Address", value: (r) => r.shippingAddress ?? "", width: 28 },
      { header: "Subtotal", value: (r) => r.subtotal, type: "money" },
      { header: "Delivery fee", value: (r) => (r.deliveryFeeConfirmed ? r.shipping : null), type: "money", width: 13 },
      { header: "Total", value: (r) => r.total, type: "money" },
      { header: "Paid", value: (r) => r.amountPaid, type: "money" },
      { header: "Balance", value: (r) => Math.max(0, Number(r.total) - Number(r.amountPaid)), type: "money" },
      { header: "Payment status", value: (r) => payStatusLabel(r.paymentStatus), width: 16 },
      { header: "Payment method", value: (r) => payLabel(r.paymentMethod ?? r.preferredPayment), width: 16 },
      { header: "Payment ref", value: (r) => r.paymentReference ?? "", width: 16 },
      { header: "Confirmed", value: (r) => r.confirmedAt, type: "datetime", width: 18 },
      { header: "Delivered", value: (r) => r.deliveredAt, type: "datetime", width: 18 },
      {
        header: "Cancel reason",
        value: (r) => (r.cancelReason ? CANCEL_REASON_LABELS[r.cancelReason as keyof typeof CANCEL_REASON_LABELS] ?? r.cancelReason : ""),
        width: 18,
      },
      { header: "Gift", value: (r) => r.isGift, type: "bool" },
      { header: "Note", value: (r) => r.notes ?? "", width: 30 },
    ]),
    sheet("Order items", items, [
      { header: "Order #", value: (r) => numberById.get(r.orderId)?.orderNumber ?? "", width: 16 },
      { header: "Placed", value: (r) => numberById.get(r.orderId)?.createdAt, type: "datetime", width: 18 },
      { header: "Order status", value: (r) => statusLabel(numberById.get(r.orderId)?.status ?? ""), width: 18 },
      { header: "Product", value: (r) => r.productName.trim(), width: 30 },
      { header: "SKU", value: (r) => r.sku ?? "", width: 16 },
      { header: "Unit price", value: (r) => r.price, type: "money" },
      { header: "Quantity", value: (r) => r.quantity, type: "int" },
      { header: "Line total", value: (r) => Number(r.price) * r.quantity, type: "money" },
    ]),
  ];
}

/* ───────────── invoices (sales records) ───────────── */

async function invoiceSheets(opts: ExportOptions): Promise<AnySheet[]> {
  const from = since(opts.days);
  const invoices = await db
    .select()
    .from(invoiceTable)
    .where(from ? gte(invoiceTable.invoiceDate, from) : undefined)
    .orderBy(desc(invoiceTable.invoiceDate));
  const ids = invoices.map((i) => i.id);
  const items = ids.length
    ? await db
        .select({ item: invoiceItemTable, category: categoryTable.name })
        .from(invoiceItemTable)
        .leftJoin(categoryTable, eq(categoryTable.id, invoiceItemTable.categoryId))
        .where(inArray(invoiceItemTable.invoiceId, ids))
    : [];
  const byId = new Map(invoices.map((i) => [i.id, i]));
  return [
    sheet("Invoices", invoices, [
      { header: "Invoice #", value: (r) => r.invoiceNumber, width: 16 },
      { header: "Date", value: (r) => r.invoiceDate, type: "date" },
      { header: "Client", value: (r) => r.clientName ?? "", width: 22 },
      { header: "Phone", value: (r) => r.clientPhone ?? "", width: 16 },
      { header: "Email", value: (r) => r.clientEmail ?? "", width: 24 },
      { header: "Subtotal", value: (r) => r.subtotal, type: "money" },
      { header: "Discount", value: (r) => r.discount, type: "money" },
      { header: "Tax", value: (r) => r.taxAmount, type: "money" },
      { header: "Printing", value: (r) => r.customDesignPrinting, type: "money" },
      { header: "Delivery", value: (r) => r.deliveries, type: "money" },
      { header: "Total", value: (r) => r.total, type: "money" },
      { header: "From website order", value: (r) => !!r.orderId, type: "bool", width: 18 },
    ]),
    sheet("Invoice items", items, [
      { header: "Invoice #", value: (r) => byId.get(r.item.invoiceId)?.invoiceNumber ?? "", width: 16 },
      { header: "Date", value: (r) => byId.get(r.item.invoiceId)?.invoiceDate, type: "date" },
      { header: "Product", value: (r) => r.item.productName.trim(), width: 30 },
      { header: "Category", value: (r) => r.category ?? "", width: 18 },
      { header: "Price type", value: (r) => r.item.priceType },
      { header: "Unit price", value: (r) => r.item.unitPrice, type: "money" },
      { header: "Quantity", value: (r) => r.item.quantity, type: "int" },
      { header: "Line total", value: (r) => r.item.lineTotal, type: "money" },
    ]),
  ];
}

/* ───────────── analytics ───────────── */

const PAYMENT_LABELS: Record<string, string> = { ...PAYMENT_METHOD_LABELS, unknown: "Not chosen" };

async function analyticsSheets(opts: ExportOptions): Promise<AnySheet[]> {
  const a = await businessAnalytics(parseRange(String(opts.days ?? 30)));
  const f = a.funnel;
  const period = `${new Date(a.from).toDateString()} – ${new Date(a.to).toDateString()}`;
  const pctChange = (v: number | null) => (v === null ? null : v / 100);
  const summary: { metric: string; value: number | string | null; previous?: number | null; change?: number | null }[] = [
    { metric: "Revenue (GHS)", value: a.current.revenue, previous: a.previous.revenue, change: pctChange(a.changes.revenue) },
    { metric: "Sales", value: a.current.sales, previous: a.previous.sales, change: pctChange(a.changes.sales) },
    { metric: "Average sale (GHS)", value: a.current.aov, previous: a.previous.aov, change: pctChange(a.changes.aov) },
    { metric: "Units sold", value: a.current.units, previous: a.previous.units, change: pctChange(a.changes.units) },
    { metric: "Buyers", value: a.customers.buyers },
    { metric: "New buyers", value: a.customers.newBuyers },
    { metric: "Returning buyers", value: a.customers.returning },
    { metric: "Stock value now (GHS)", value: a.stock.value },
    { metric: "Units in stock now", value: a.stock.units },
    { metric: "Orders placed on website", value: f.placed },
    { metric: "Sent on WhatsApp", value: f.sent },
    { metric: "Confirmed", value: f.confirmed },
    { metric: "Delivered / picked up", value: f.handedOver },
    { metric: "Completed", value: f.completed },
    { metric: "Cancelled", value: f.cancelled },
    { metric: "Expired", value: f.expired },
    { metric: "Returned", value: f.returned },
    { metric: "Delivery orders", value: f.delivery },
    { metric: "Pickup orders", value: f.pickup },
    { metric: "Gift orders", value: f.gifts },
    { metric: "Median minutes to confirm", value: f.confirmMins === null ? null : Math.round(f.confirmMins) },
    { metric: "Median minutes confirm → delivered", value: f.deliverMins === null ? null : Math.round(f.deliverMins) },
  ];
  const summarySheet = sheet(
    "Summary",
    summary,
    [
      { header: "Metric", value: (r) => r.metric, width: 34 },
      { header: "This period", value: (r) => r.value, type: "number", width: 14 },
      { header: "Previous period", value: (r) => r.previous, type: "number", width: 16 },
      { header: "Change", value: (r) => r.change, type: "number" },
    ],
    `Last ${a.days} days (${period}), compared with the ${a.days} days before. Change is a fraction (0.25 = +25%).`,
  );
  return [
    summarySheet,
    sheet(a.weekly ? "Weekly revenue" : "Daily revenue", a.series, [
      { header: a.weekly ? "Week starting" : "Day", value: (r) => r.day, type: "date", width: 14 },
      { header: "Revenue (GHS)", value: (r) => r.revenue, type: "money", width: 15 },
      { header: "Sales", value: (r) => r.orders, type: "int" },
    ]),
    sheet("Top products", a.topProducts, [
      { header: "Product", value: (r) => r.name, width: 30 },
      { header: "Units", value: (r) => r.units, type: "int" },
      { header: "Revenue (GHS)", value: (r) => r.revenue, type: "money", width: 15 },
    ]),
    sheet("Sales by category", a.byCategory, [
      { header: "Category", value: (r) => r.name, width: 24 },
      { header: "Units", value: (r) => r.units, type: "int" },
      { header: "Revenue (GHS)", value: (r) => r.revenue, type: "money", width: 15 },
    ]),
    sheet("Top customers", a.topCustomers, [
      { header: "Name", value: (r) => r.name, width: 24 },
      { header: "Phone", value: (r) => phone(r.phone || null), width: 16 },
      { header: "Orders", value: (r) => r.orders, type: "int" },
      { header: "Spent (GHS)", value: (r) => r.spent, type: "money" },
    ]),
    sheet("Delivery areas", a.areas, [
      { header: "Area", value: (r) => r.name, width: 24 },
      { header: "Orders", value: (r) => r.count, type: "int" },
    ]),
    sheet("Payment methods", a.payments, [
      { header: "Method", value: (r) => PAYMENT_LABELS[r.method] ?? r.method, width: 20 },
      { header: "Orders", value: (r) => r.count, type: "int" },
    ]),
    sheet("Orders by weekday", a.weekdays, [
      { header: "Day", value: (r) => r.name },
      { header: "Orders", value: (r) => r.count, type: "int" },
    ]),
    sheet("Cancel reasons", a.cancelReasons, [
      { header: "Reason", value: (r) => CANCEL_REASON_LABELS[r.reason as keyof typeof CANCEL_REASON_LABELS] ?? r.reason, width: 26 },
      { header: "Orders", value: (r) => r.count, type: "int" },
    ]),
  ];
}

/* ───────────── registry ───────────── */

export const DATASETS = {
  analytics: { label: "Analytics", permission: "canViewAnalytics", sheets: analyticsSheets },
  inventory: {
    label: "Inventory",
    permission: "canManageInventory",
    sheets: async (opts) => [...(await productSheets()), await stockMovementSheet(opts)],
  },
  products: { label: "Products", permission: "canManageProducts", sheets: () => productSheets() },
  categories: { label: "Categories", permission: "canManageCategories", sheets: () => categorySheets() },
  customers: { label: "Customers", permission: "canManageCustomers", sheets: () => customerSheets() },
  orders: { label: "Orders", permission: "canManageOrders", sheets: orderSheets },
  invoices: { label: "Invoices", permission: "canViewAnalytics", sheets: invoiceSheets },
} satisfies Record<string, Dataset>;

export type DatasetKey = keyof typeof DATASETS;
export const isDatasetKey = (v: string): v is DatasetKey => Object.hasOwn(DATASETS, v);
