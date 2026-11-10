import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { adminUserTable } from "../admin/tables";

/**
 * Owner/manager-editable business settings. One row per section
 * ("brand", "contact", "locations", "social", "payments", ...). The value is
 * validated by the section's Zod schema in src/lib/settings/schemas.ts before
 * every write; reads merge it over the section defaults.
 */
export const siteSettingTable = pgTable("site_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: text("updated_by").references(() => adminUserTable.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Append-only change history for site settings; powers "revert". */
export const settingAuditTable = pgTable(
  "setting_audit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    before: jsonb("before"),
    after: jsonb("after").notNull(),
    changedBy: text("changed_by").references(() => adminUserTable.id, {
      onDelete: "set null",
    }),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
  },
  (t) => [index("setting_audit_key_changed_at_idx").on(t.key, t.changedAt.desc())],
);
