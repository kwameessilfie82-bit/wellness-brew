-- 0011: lock down the Data API + index every foreign key / hot filter.
--
-- SECURITY: Supabase exposes the `public` schema through PostgREST, and the
-- anon key ships to every browser. Until now RLS was off and anon/authenticated
-- held table grants, so anyone could read `user`, `session`, `store_order`
-- (phones + addresses) etc. straight from the REST API.
-- The app talks to Postgres only via Drizzle as the table owner (`postgres`),
-- which bypasses RLS, so enabling RLS with NO policies denies the Data API
-- while leaving the app untouched.

ALTER TABLE "admin_role"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_user"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "category"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoice_item"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_event"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_item"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_variant"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rate_limit"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "setting_audit"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_setting"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "store_order"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "two_factor"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "uploads"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification"          ENABLE ROW LEVEL SECURITY;

-- Defence in depth: the Data API roles get no table privileges at all.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- PERFORMANCE: Postgres does not index foreign keys automatically. Without
-- these, joins and ON DELETE CASCADE/SET NULL scan whole tables.

-- Storefront listing: active products by category, newest first.
CREATE INDEX IF NOT EXISTS "product_category_active_created_idx" ON "product" ("category_id", "is_active", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "product_active_created_idx" ON "product" ("is_active", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "product_featured_created_idx" ON "product" ("created_at" DESC) WHERE "is_active" AND "is_featured";
CREATE INDEX IF NOT EXISTS "product_created_by_idx" ON "product" ("created_by");
CREATE INDEX IF NOT EXISTS "category_created_by_idx" ON "category" ("created_by");
CREATE INDEX IF NOT EXISTS "product_variant_product_idx" ON "product_variant" ("product_id");

-- Stock ledger: per-product history and date-range exports.
CREATE INDEX IF NOT EXISTS "inventory_txn_product_created_idx" ON "inventory_transaction" ("product_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "inventory_txn_created_idx" ON "inventory_transaction" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "inventory_txn_performed_by_idx" ON "inventory_transaction" ("performed_by");

-- Orders / invoices.
CREATE INDEX IF NOT EXISTS "store_order_user_created_idx" ON "store_order" ("user_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "store_order_assigned_to_idx" ON "store_order" ("assigned_to");
CREATE INDEX IF NOT EXISTS "order_item_product_idx" ON "order_item" ("product_id");
CREATE INDEX IF NOT EXISTS "order_event_actor_idx" ON "order_event" ("actor_id");
CREATE INDEX IF NOT EXISTS "invoice_item_invoice_idx" ON "invoice_item" ("invoice_id");
CREATE INDEX IF NOT EXISTS "invoice_item_product_idx" ON "invoice_item" ("product_id");
CREATE INDEX IF NOT EXISTS "invoice_created_by_idx" ON "invoice" ("created_by");

-- Admin / auth / settings.
CREATE INDEX IF NOT EXISTS "admin_user_role_idx" ON "admin_user" ("role_id");
CREATE INDEX IF NOT EXISTS "admin_user_created_by_idx" ON "admin_user" ("created_by");
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "two_factor_user_idx" ON "two_factor" ("user_id");
CREATE INDEX IF NOT EXISTS "uploads_user_idx" ON "uploads" ("user_id");
CREATE INDEX IF NOT EXISTS "site_setting_updated_by_idx" ON "site_setting" ("updated_by");
CREATE INDEX IF NOT EXISTS "setting_audit_changed_by_idx" ON "setting_audit" ("changed_by");

-- 0005 and 0008 both created an index on invoice(invoice_date) - keep one.
DROP INDEX IF EXISTS "invoice_invoice_date_idx";
CREATE INDEX IF NOT EXISTS "invoice_date_idx" ON "invoice" ("invoice_date");
