-- WhatsApp ordering: web cart -> order record -> WhatsApp hand-off -> staff-driven
-- lifecycle with a customer-facing order page, rider proof of delivery and an
-- event timeline. Idempotent: safe to run more than once.
-- NOTE: run-sql.mjs splits on semicolons, so no semicolons inside strings.

CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START 1;

-- Existing rows predate WhatsApp ordering: give them the legacy channel via the
-- column default, then switch the default for new rows.
ALTER TABLE "store_order" ADD COLUMN IF NOT EXISTS "channel" text NOT NULL DEFAULT 'web_paystack_legacy';
ALTER TABLE "store_order" ALTER COLUMN "channel" SET DEFAULT 'whatsapp';

ALTER TABLE "store_order" ALTER COLUMN "customer_email" DROP NOT NULL;
ALTER TABLE "store_order" ALTER COLUMN "shipping_address" DROP NOT NULL;
ALTER TABLE "store_order" ALTER COLUMN "status" SET DEFAULT 'awaiting_customer';
ALTER TABLE "store_order" ALTER COLUMN "payment_status" SET DEFAULT 'unpaid';

ALTER TABLE "store_order"
  ADD COLUMN IF NOT EXISTS "public_token" text,
  ADD COLUMN IF NOT EXISTS "fulfilment" text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS "customer_phone_e164" text,
  ADD COLUMN IF NOT EXISTS "delivery_zone_id" text,
  ADD COLUMN IF NOT EXISTS "delivery_area" text,
  ADD COLUMN IF NOT EXISTS "gps_address" text,
  ADD COLUMN IF NOT EXISTS "delivery_fee_confirmed" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "pickup_location_id" text,
  ADD COLUMN IF NOT EXISTS "pickup_location_name" text,
  ADD COLUMN IF NOT EXISTS "delivery_window" text,
  ADD COLUMN IF NOT EXISTS "is_gift" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recipient_name" text,
  ADD COLUMN IF NOT EXISTS "recipient_phone" text,
  ADD COLUMN IF NOT EXISTS "gift_message" text,
  ADD COLUMN IF NOT EXISTS "preferred_payment" text,
  ADD COLUMN IF NOT EXISTS "amount_paid" numeric(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delivery_code" text,
  ADD COLUMN IF NOT EXISTS "rider_token" text,
  ADD COLUMN IF NOT EXISTS "rider_token_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "rider_failed_attempts" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delivered_at" timestamp,
  ADD COLUMN IF NOT EXISTS "delivery_proof" text,
  ADD COLUMN IF NOT EXISTS "assigned_to" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "whatsapp_received_at" timestamp,
  ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "stock_deducted" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "cancel_reason" text,
  ADD COLUMN IF NOT EXISTS "attention_reason" text,
  ADD COLUMN IF NOT EXISTS "idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 0;

-- Legacy Paystack attempts that never completed payment become cancelled.
UPDATE "store_order"
  SET "status" = 'cancelled', "cancel_reason" = 'legacy_unpaid'
  WHERE "channel" = 'web_paystack_legacy' AND "status" IN ('pending', 'pending_payment');
UPDATE "store_order"
  SET "status" = 'confirmed'
  WHERE "channel" = 'web_paystack_legacy' AND "status" IN ('processing', 'paid');
UPDATE "store_order" SET "payment_status" = 'unpaid'
  WHERE "payment_status" IS NULL OR "payment_status" IN ('pending', 'failed');
UPDATE "store_order"
  SET "public_token" = replace(gen_random_uuid()::text, '-', '')
  WHERE "public_token" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "store_order_public_token_idx" ON "store_order" ("public_token");
CREATE UNIQUE INDEX IF NOT EXISTS "store_order_rider_token_idx" ON "store_order" ("rider_token");
CREATE UNIQUE INDEX IF NOT EXISTS "store_order_idempotency_key_idx" ON "store_order" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "store_order_status_created_idx" ON "store_order" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_order_created_idx" ON "store_order" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_order_phone_created_idx" ON "store_order" ("customer_phone_e164", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_order_expiry_idx" ON "store_order" ("expires_at") WHERE "status" = 'awaiting_customer';
CREATE INDEX IF NOT EXISTS "order_item_order_id_idx" ON "order_item" ("order_id");

-- Timeline: every status change, payment, edit, note and message for an order.
CREATE TABLE IF NOT EXISTS "order_event" (
  "id" text PRIMARY KEY NOT NULL,
  "order_id" text NOT NULL REFERENCES "store_order"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "from_status" text,
  "to_status" text,
  "data" jsonb,
  "actor_type" text NOT NULL,
  "actor_id" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "customer_visible" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "order_event_order_created_idx" ON "order_event" ("order_id", "created_at");

-- Fixed-window counters for rate limiting (order placement, rider codes, customer actions).
CREATE TABLE IF NOT EXISTS "rate_limit" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL,
  "window_start" timestamp NOT NULL
);
CREATE INDEX IF NOT EXISTS "rate_limit_window_idx" ON "rate_limit" ("window_start");

-- Link confirmed WhatsApp orders to an invoice so sales reports include them.
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "order_id" text REFERENCES "store_order"("id") ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_order_id_idx" ON "invoice" ("order_id");
