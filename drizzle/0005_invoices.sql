-- Persisted invoices from the admin invoice generator; source for analytics.
CREATE TABLE IF NOT EXISTS "invoice" (
  "id" text PRIMARY KEY NOT NULL,
  "invoice_number" text NOT NULL,
  "invoice_date" timestamp NOT NULL,
  "client_name" text,
  "client_phone" text,
  "client_email" text,
  "client_address" text,
  "subtotal" numeric(10, 2) NOT NULL,
  "tax_rate" numeric(6, 2) NOT NULL DEFAULT '0',
  "tax_amount" numeric(10, 2) NOT NULL DEFAULT '0',
  "discount" numeric(10, 2) NOT NULL DEFAULT '0',
  "custom_design_printing" numeric(10, 2) NOT NULL DEFAULT '0',
  "deliveries" numeric(10, 2) NOT NULL DEFAULT '0',
  "total" numeric(10, 2) NOT NULL,
  "created_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "invoice_item" (
  "id" text PRIMARY KEY NOT NULL,
  "invoice_id" text NOT NULL REFERENCES "invoice"("id") ON DELETE CASCADE,
  "product_id" text REFERENCES "product"("id") ON DELETE SET NULL,
  "category_id" text,
  "product_name" text NOT NULL,
  "price_type" text NOT NULL DEFAULT 'customer',
  "unit_price" numeric(10, 2) NOT NULL,
  "quantity" integer NOT NULL,
  "line_total" numeric(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "invoice_invoice_date_idx" ON "invoice" ("invoice_date");
CREATE INDEX IF NOT EXISTS "invoice_item_invoice_id_idx" ON "invoice_item" ("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_item_product_id_idx" ON "invoice_item" ("product_id");
