-- 0012: roadmap stages 3–8 — product details, promotions, inquiries, reviews,
-- Brew Journal, first-party events, KPI + roadmap trackers, activity log.
-- Apply with `npm run db:migrate-0012` (one transaction, idempotent).
-- Every new table: RLS on with no policies (deny-all for the Data API; the app
-- connects as the owner via Drizzle). anon/authenticated get no grants
-- (default privileges from 0011 already revoke them).

-- ── Product details (one JSONB document; shape validated by Zod) ───────────
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "details" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── Promotions on orders ──────────────────────────────────────────────────
ALTER TABLE "store_order" ADD COLUMN IF NOT EXISTS "promo_code" text;
ALTER TABLE "store_order" ADD COLUMN IF NOT EXISTS "discount" numeric(10, 2) NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS "store_order_promo_code_idx" ON "store_order" ("promo_code") WHERE "promo_code" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "promo_code" (
  "id" text PRIMARY KEY,
  "code" text NOT NULL UNIQUE,
  "kind" text NOT NULL DEFAULT 'discount' CHECK ("kind" IN ('discount', 'referral', 'bundle')),
  "discount_type" text NOT NULL DEFAULT 'percent' CHECK ("discount_type" IN ('percent', 'fixed')),
  "value" numeric(10, 2) NOT NULL CHECK ("value" >= 0),
  "min_subtotal" numeric(10, 2) NOT NULL DEFAULT 0,
  "bundle_product_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "max_uses" integer,
  "uses" integer NOT NULL DEFAULT 0,
  "referrer_name" text,
  "referrer_phone" text,
  "note" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "promo_code_created_by_idx" ON "promo_code" ("created_by");
CREATE INDEX IF NOT EXISTS "promo_code_created_idx" ON "promo_code" ("created_at" DESC);
ALTER TABLE "promo_code" ENABLE ROW LEVEL SECURITY;

-- ── Inquiries: corporate gifting, stockist partnerships, general ──────────
CREATE TABLE IF NOT EXISTS "inquiry" (
  "id" text PRIMARY KEY,
  "kind" text NOT NULL CHECK ("kind" IN ('gifting', 'stockist', 'general')),
  "status" text NOT NULL DEFAULT 'new' CHECK ("status" IN ('new', 'contacted', 'quoted', 'won', 'lost')),
  "name" text NOT NULL,
  "company" text,
  "phone" text,
  "email" text,
  "message" text,
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "source" text,
  "staff_notes" text,
  "assigned_to" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "inquiry_status_created_idx" ON "inquiry" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "inquiry_kind_created_idx" ON "inquiry" ("kind", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "inquiry_assigned_to_idx" ON "inquiry" ("assigned_to");
ALTER TABLE "inquiry" ENABLE ROW LEVEL SECURITY;

-- ── Reviews (customer-submitted, moderated) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "review" (
  "id" text PRIMARY KEY,
  "product_id" text REFERENCES "product"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "location" text,
  "rating" integer NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "title" text,
  "body" text NOT NULL,
  "consent" boolean NOT NULL DEFAULT false,
  "status" text NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'approved', 'rejected')),
  "is_featured" boolean NOT NULL DEFAULT false,
  "order_number" text,
  "moderated_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "moderated_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "review_product_status_created_idx" ON "review" ("product_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "review_status_created_idx" ON "review" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "review_featured_idx" ON "review" ("created_at" DESC) WHERE "status" = 'approved' AND "is_featured";
CREATE INDEX IF NOT EXISTS "review_moderated_by_idx" ON "review" ("moderated_by");
ALTER TABLE "review" ENABLE ROW LEVEL SECURITY;

-- ── Brew Journal ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "post" (
  "id" text PRIMARY KEY,
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "excerpt" text,
  "cover_url" text,
  "body" text NOT NULL DEFAULT '',
  "seo_title" text,
  "seo_description" text,
  "status" text NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'published')),
  "published_at" timestamp,
  "author_id" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "post_published_idx" ON "post" ("published_at" DESC) WHERE "status" = 'published';
CREATE INDEX IF NOT EXISTS "post_updated_idx" ON "post" ("updated_at" DESC);
CREATE INDEX IF NOT EXISTS "post_author_idx" ON "post" ("author_id");
ALTER TABLE "post" ENABLE ROW LEVEL SECURITY;

-- ── First-party site events (feed KPIs; no personal data) ─────────────────
CREATE TABLE IF NOT EXISTS "site_event" (
  "id" bigserial PRIMARY KEY,
  "name" text NOT NULL,
  "path" text,
  "product_id" text,
  "value" numeric(10, 2),
  "variant" text,
  "utm_source" text,
  "utm_medium" text,
  "utm_campaign" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "site_event_name_created_idx" ON "site_event" ("name", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "site_event_created_idx" ON "site_event" ("created_at" DESC);
ALTER TABLE "site_event" ENABLE ROW LEVEL SECURITY;

-- ── KPI tracker: one value per (week, metric) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "kpi_entry" (
  "week_start" date NOT NULL,
  "metric" text NOT NULL,
  "value" numeric(14, 2) NOT NULL,
  "updated_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "updated_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("week_start", "metric")
);
CREATE INDEX IF NOT EXISTS "kpi_entry_updated_by_idx" ON "kpi_entry" ("updated_by");
ALTER TABLE "kpi_entry" ENABLE ROW LEVEL SECURITY;

-- ── Roadmap tracker ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "roadmap_item" (
  "id" text PRIMARY KEY,
  "position" integer NOT NULL DEFAULT 0,
  "phase" text,
  "action" text NOT NULL,
  "channel" text,
  "owner" text,
  "due_date" date,
  "status" text NOT NULL DEFAULT 'todo' CHECK ("status" IN ('todo', 'doing', 'done', 'blocked')),
  "notes" text,
  "updated_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "roadmap_item_position_idx" ON "roadmap_item" ("position");
CREATE INDEX IF NOT EXISTS "roadmap_item_updated_by_idx" ON "roadmap_item" ("updated_by");
ALTER TABLE "roadmap_item" ENABLE ROW LEVEL SECURITY;

-- ── Activity log: who changed what, across modules ───────────────────────
CREATE TABLE IF NOT EXISTS "activity_log" (
  "id" text PRIMARY KEY,
  "actor_id" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "module" text NOT NULL,
  "action" text NOT NULL,
  "entity_id" text,
  "summary" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "activity_log_created_idx" ON "activity_log" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "activity_log_module_created_idx" ON "activity_log" ("module", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "activity_log_actor_idx" ON "activity_log" ("actor_id");
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON "promo_code", "inquiry", "review", "post", "site_event", "kpi_entry", "roadmap_item", "activity_log" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE "site_event_id_seq" FROM anon, authenticated;
