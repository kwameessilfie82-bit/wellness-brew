CREATE TABLE IF NOT EXISTS "store_order" (
  "id" text PRIMARY KEY NOT NULL,
  "order_number" text NOT NULL UNIQUE,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "customer_email" text NOT NULL,
  "customer_name" text NOT NULL,
  "customer_phone" text,
  "shipping_address" text NOT NULL,
  "shipping_method" text,
  "payment_method" text,
  "subtotal" numeric(10, 2) NOT NULL,
  "shipping" numeric(10, 2) NOT NULL,
  "tax" numeric(10, 2) NOT NULL,
  "total" numeric(10, 2) NOT NULL,
  "notes" text,
  "created_at" timestamp NOT NULL,
  "updated_at" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_item" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "store_order"("id") ON DELETE CASCADE,
  "product_id" text REFERENCES "product"("id") ON DELETE SET NULL,
  "product_name" text NOT NULL,
  "sku" text,
  "price" numeric(10, 2) NOT NULL,
  "quantity" integer NOT NULL,
  "image" text
);
