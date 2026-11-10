-- Customer-shared map pin ("Use my current location" on the order form).
-- Idempotent: safe to run more than once.
ALTER TABLE "store_order"
  ADD COLUMN IF NOT EXISTS "delivery_lat" double precision,
  ADD COLUMN IF NOT EXISTS "delivery_lng" double precision,
  ADD COLUMN IF NOT EXISTS "location_accuracy_m" integer;

-- Analytics reads orders by creation date regardless of status.
CREATE INDEX IF NOT EXISTS "store_order_channel_created_idx" ON "store_order" ("channel", "created_at");
CREATE INDEX IF NOT EXISTS "invoice_date_idx" ON "invoice" ("invoice_date");
