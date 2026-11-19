import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { adminUserTable, productTable } from "../admin/tables";

/** Tables for roadmap stages 3–8. SQL source of truth: drizzle/0012_growth.sql. */

export const promoCodeTable = pgTable(
  "promo_code",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull().unique(),
    kind: text("kind").notNull().default("discount"), // discount | referral | bundle
    discountType: text("discount_type").notNull().default("percent"), // percent | fixed
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    minSubtotal: decimal("min_subtotal", { precision: 10, scale: 2 }).notNull().default("0"),
    bundleProductIds: jsonb("bundle_product_ids").$type<string[]>().notNull().default([]),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    maxUses: integer("max_uses"),
    uses: integer("uses").notNull().default(0),
    referrerName: text("referrer_name"),
    referrerPhone: text("referrer_phone"),
    note: text("note"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => adminUserTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("promo_code_created_by_idx").on(t.createdBy), index("promo_code_created_idx").on(t.createdAt.desc())],
).enableRLS();

export const inquiryTable = pgTable(
  "inquiry",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(), // gifting | stockist | general
    status: text("status").notNull().default("new"), // new | contacted | quoted | won | lost
    name: text("name").notNull(),
    company: text("company"),
    phone: text("phone"),
    email: text("email"),
    message: text("message"),
    details: jsonb("details").$type<Record<string, string>>().notNull().default({}),
    source: text("source"),
    staffNotes: text("staff_notes"),
    assignedTo: text("assigned_to").references(() => adminUserTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("inquiry_status_created_idx").on(t.status, t.createdAt.desc()),
    index("inquiry_kind_created_idx").on(t.kind, t.createdAt.desc()),
    index("inquiry_assigned_to_idx").on(t.assignedTo),
  ],
).enableRLS();

export const reviewTable = pgTable(
  "review",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").references(() => productTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location"),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    consent: boolean("consent").notNull().default(false),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    isFeatured: boolean("is_featured").notNull().default(false),
    orderNumber: text("order_number"),
    moderatedBy: text("moderated_by").references(() => adminUserTable.id, { onDelete: "set null" }),
    moderatedAt: timestamp("moderated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("review_product_status_created_idx").on(t.productId, t.status, t.createdAt.desc()),
    index("review_status_created_idx").on(t.status, t.createdAt.desc()),
    index("review_featured_idx").on(t.createdAt.desc()).where(sql`${t.status} = 'approved' AND ${t.isFeatured}`),
    index("review_moderated_by_idx").on(t.moderatedBy),
  ],
).enableRLS();

export const postTable = pgTable(
  "post",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    coverUrl: text("cover_url"),
    body: text("body").notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: text("status").notNull().default("draft"), // draft | published
    publishedAt: timestamp("published_at"),
    authorId: text("author_id").references(() => adminUserTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("post_published_idx").on(t.publishedAt.desc()).where(sql`${t.status} = 'published'`),
    index("post_updated_idx").on(t.updatedAt.desc()),
    index("post_author_idx").on(t.authorId),
  ],
).enableRLS();

export const siteEventTable = pgTable(
  "site_event",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    path: text("path"),
    productId: text("product_id"),
    value: decimal("value", { precision: 10, scale: 2 }),
    variant: text("variant"),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("site_event_name_created_idx").on(t.name, t.createdAt.desc()),
    index("site_event_created_idx").on(t.createdAt.desc()),
  ],
).enableRLS();

export const kpiEntryTable = pgTable(
  "kpi_entry",
  {
    weekStart: date("week_start").notNull(),
    metric: text("metric").notNull(),
    value: decimal("value", { precision: 14, scale: 2 }).notNull(),
    updatedBy: text("updated_by").references(() => adminUserTable.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.weekStart, t.metric] }), index("kpi_entry_updated_by_idx").on(t.updatedBy)],
).enableRLS();

export const roadmapItemTable = pgTable(
  "roadmap_item",
  {
    id: text("id").primaryKey(),
    position: integer("position").notNull().default(0),
    priority: text("priority"),
    phase: text("phase"),
    action: text("action").notNull(),
    why: text("why"),
    effort: text("effort"),
    impact: text("impact"),
    successMeasure: text("success_measure"),
    dependency: text("dependency"),
    channel: text("channel"),
    owner: text("owner"),
    dueDate: date("due_date"),
    status: text("status").notNull().default("todo"), // todo | doing | done | blocked
    notes: text("notes"),
    updatedBy: text("updated_by").references(() => adminUserTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("roadmap_item_position_idx").on(t.position), index("roadmap_item_updated_by_idx").on(t.updatedBy)],
).enableRLS();

export const activityLogTable = pgTable(
  "activity_log",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => adminUserTable.id, { onDelete: "set null" }),
    module: text("module").notNull(),
    action: text("action").notNull(),
    entityId: text("entity_id"),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("activity_log_created_idx").on(t.createdAt.desc()),
    index("activity_log_module_created_idx").on(t.module, t.createdAt.desc()),
    index("activity_log_actor_idx").on(t.actorId),
  ],
).enableRLS();
