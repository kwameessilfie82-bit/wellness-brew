-- Per-product FDA Ghana registration number. Nullable: when empty the public
-- badge falls back to the site-wide approved registration (Settings → Compliance).
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "fda_reg_number" text;
