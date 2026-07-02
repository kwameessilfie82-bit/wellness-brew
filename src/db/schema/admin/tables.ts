import { pgTable, text, timestamp, boolean, integer, decimal } from "drizzle-orm/pg-core";
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

export const storeOrderTable = pgTable("store_order", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: text("user_id").references(() => userTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("pending"),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  shippingAddress: text("shipping_address").notNull(),
  shippingMethod: text("shipping_method"),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  paymentStatus: text("payment_status").default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

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
