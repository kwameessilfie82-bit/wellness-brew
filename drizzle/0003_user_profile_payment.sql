ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delivery_region" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delivery_location" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delivery_landmark" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delivery_latitude" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "delivery_longitude" text;

ALTER TABLE "store_order" ADD COLUMN IF NOT EXISTS "payment_reference" text;
ALTER TABLE "store_order" ADD COLUMN IF NOT EXISTS "payment_status" text DEFAULT 'pending';
