import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { userTable } from "../users/tables";

// Admin roles table
export const adminRoleTable = pgTable("admin_role", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // "super_admin", "admin", "manager"
  description: text("description"),
  permissions: text("permissions").notNull(), // JSON string of permissions
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Admin users table (extends user table)
export const adminUserTable = pgTable("admin_user", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" })
    .unique(),
  roleId: text("role_id")
    .notNull()
    .references(() => adminRoleTable.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by")
    .references(() => userTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Categories table
export const categoryTable = pgTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  image: text("image"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => adminUserTable.id, { onDelete: "cascade" }),
});

// Products table
export const productTable = pgTable("product", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  categoryId: text("category_id")
    .notNull()
    .references(() => categoryTable.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  // Invoice pricing tiers (shared source of truth with the invoice generator).
  customerPrice: decimal("customer_price", { precision: 10, scale: 2 }),
  retailPrice: decimal("retail_price", { precision: 10, scale: 2 }),
  wholesalePrice: decimal("wholesale_price", { precision: 10, scale: 2 }),
  wholesalePrice2: decimal("wholesale_price2", { precision: 10, scale: 2 }),
  distributorPrice: decimal("distributor_price", { precision: 10, scale: 2 }),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode"),
  images: text("images").notNull().default('[]'), // JSON array of image URLs
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  requiresPrescription: boolean("requires_prescription").notNull().default(false),
  weight: decimal("weight", { precision: 8, scale: 2 }), // in grams
  dimensions: text("dimensions"), // JSON: {length, width, height}
  manufacturer: text("manufacturer"),
  expiryDate: timestamp("expiry_date"),
  batchNumber: text("batch_number"),
  tags: text("tags"), // JSON array of tags
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => adminUserTable.id, { onDelete: "cascade" }),
});

// Inventory table
export const inventoryTable = pgTable("inventory", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "cascade" })
    .unique(),
  quantityInStock: integer("quantity_in_stock").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  quantityAvailable: integer("quantity_available").notNull().default(0), // calculated field
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  reorderPoint: integer("reorder_point").notNull().default(5),
  reorderQuantity: integer("reorder_quantity").notNull().default(50),
  lastRestocked: timestamp("last_restocked"),
  lastCounted: timestamp("last_counted"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Inventory transactions table (for tracking stock movements)
export const inventoryTransactionTable = pgTable("inventory_transaction", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "in", "out", "adjustment", "transfer"
  quantity: integer("quantity").notNull(), // positive for in, negative for out
  reason: text("reason").notNull(), // "purchase", "sale", "return", "damage", "adjustment"
  reference: text("reference"), // order ID, purchase order, etc.
  notes: text("notes"),
  performedBy: text("performed_by")
    .notNull()
    .references(() => adminUserTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull(),
});

// Product variants table (for different sizes, colors, etc.)
export const productVariantTable = pgTable("product_variant", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => productTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Small", "Red", "500mg", etc.
  sku: text("sku").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }),
  quantityInStock: integer("quantity_in_stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  attributes: text("attributes"), // JSON: {size: "L", color: "red"}
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/** Order statuses / channels: see src/lib/orders/status.ts. */
export const storeOrderTable = pgTable(
  "store_order",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    publicToken: text("public_token"),
    channel: text("channel").notNull().default("whatsapp"),
    userId: text("user_id").references(() => userTable.id, { onDelete: "set null" }),
    status: text("status").notNull().default("awaiting_customer"),
    customerEmail: text("customer_email"),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    customerPhoneE164: text("customer_phone_e164"),
    fulfilment: text("fulfilment").notNull().default("delivery"),
    /** Delivery address / landmark (free text). */
    shippingAddress: text("shipping_address"),
    shippingMethod: text("shipping_method"),
    deliveryZoneId: text("delivery_zone_id"),
    deliveryArea: text("delivery_area"),
    gpsAddress: text("gps_address"),
    /** Map pin the customer shared from their device. */
    deliveryLat: doublePrecision("delivery_lat"),
    deliveryLng: doublePrecision("delivery_lng"),
    locationAccuracyM: integer("location_accuracy_m"),
    deliveryFeeConfirmed: boolean("delivery_fee_confirmed").notNull().default(true),
    pickupLocationId: text("pickup_location_id"),
    pickupLocationName: text("pickup_location_name"),
    deliveryWindow: text("delivery_window"),
    isGift: boolean("is_gift").notNull().default(false),
    recipientName: text("recipient_name"),
    recipientPhone: text("recipient_phone"),
    giftMessage: text("gift_message"),
    preferredPayment: text("preferred_payment"),
    paymentMethod: text("payment_method"),
    paymentReference: text("payment_reference"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    /** Delivery fee. */
    shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    deliveryCode: text("delivery_code"),
    riderToken: text("rider_token"),
    riderTokenExpiresAt: timestamp("rider_token_expires_at"),
    riderFailedAttempts: integer("rider_failed_attempts").notNull().default(0),
    deliveredAt: timestamp("delivered_at"),
    deliveryProof: text("delivery_proof"),
    assignedTo: text("assigned_to").references(() => adminUserTable.id, { onDelete: "set null" }),
    whatsappReceivedAt: timestamp("whatsapp_received_at"),
    confirmedAt: timestamp("confirmed_at"),
    stockDeducted: boolean("stock_deducted").notNull().default(false),
    expiresAt: timestamp("expires_at"),
    cancelReason: text("cancel_reason"),
    attentionReason: text("attention_reason"),
    idempotencyKey: text("idempotency_key"),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("store_order_public_token_idx").on(t.publicToken),
    uniqueIndex("store_order_rider_token_idx").on(t.riderToken),
    uniqueIndex("store_order_idempotency_key_idx").on(t.idempotencyKey),
    index("store_order_status_created_idx").on(t.status, t.createdAt.desc()),
    index("store_order_created_idx").on(t.createdAt.desc()),
    index("store_order_phone_created_idx").on(t.customerPhoneE164, t.createdAt.desc()),
    index("store_order_expiry_idx").on(t.expiresAt).where(sql`${t.status} = 'awaiting_customer'`),
  ],
);

export const orderItemTable = pgTable("order_item", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => storeOrderTable.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => productTable.id, {
    onDelete: "set null",
  }),
  productName: text("product_name").notNull(),
  sku: text("sku"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  image: text("image"),
});

// Invoices saved from the admin invoice generator — the source of truth for
// dashboard sales analytics. Line items snapshot name/price/category so the
// figures survive a later product rename or deletion.
export const invoiceTable = pgTable("invoice", {
  id: text("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  clientAddress: text("client_address"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 6, scale: 2 }).notNull().default("0"),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  customDesignPrinting: decimal("custom_design_printing", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  deliveries: decimal("deliveries", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  createdBy: text("created_by").references(() => adminUserTable.id, {
    onDelete: "set null",
  }),
  /** Set when the invoice was generated from a WhatsApp order. */
  orderId: text("order_id")
    .unique("invoice_order_id_idx")
    .references(() => storeOrderTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull(),
});

export const invoiceItemTable = pgTable("invoice_item", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoiceTable.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => productTable.id, {
    onDelete: "set null",
  }),
  categoryId: text("category_id"),
  productName: text("product_name").notNull(),
  priceType: text("price_type").notNull().default("customer"),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

/** Order timeline: status changes, payments, edits, notes and messages. */
export const orderEventTable = pgTable(
  "order_event",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => storeOrderTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    data: jsonb("data"),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").references(() => adminUserTable.id, { onDelete: "set null" }),
    customerVisible: boolean("customer_visible").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("order_event_order_created_idx").on(t.orderId, t.createdAt)],
);

/** Fixed-window rate-limit counters. */
export const rateLimitTable = pgTable(
  "rate_limit",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    windowStart: timestamp("window_start").notNull(),
  },
  (t) => [index("rate_limit_window_idx").on(t.windowStart)],
);
