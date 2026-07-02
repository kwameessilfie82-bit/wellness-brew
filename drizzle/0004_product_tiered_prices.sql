-- Invoice pricing tiers on product: single source of truth shared with the
-- invoice generator. Nullable; readers fall back to price/customerPrice.
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "customer_price" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "retail_price" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "wholesale_price" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "wholesale_price2" numeric(10, 2);
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "distributor_price" numeric(10, 2);
