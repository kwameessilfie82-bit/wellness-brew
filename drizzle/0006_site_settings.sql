-- Owner/manager-editable business settings (one JSONB row per section) + audit.
CREATE TABLE IF NOT EXISTS "site_setting" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "setting_audit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "before" jsonb,
  "after" jsonb NOT NULL,
  "changed_by" text REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "changed_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "setting_audit_key_changed_at_idx"
  ON "setting_audit" ("key", "changed_at" DESC);
