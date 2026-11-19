import "server-only";

import { db } from "@/db";
import { activityLogTable, type AdminPermissions, type AdminUserWithDetails } from "@/db/schema";
import { hasPermission, isAdmin } from "@/lib/admin-auth";

export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Signed-in admin with the permission, or null. For server actions. */
export async function requireAdminPermission(
  permission: keyof AdminPermissions,
): Promise<AdminUserWithDetails | null> {
  const admin = await isAdmin();
  return admin && hasPermission(admin, permission) ? admin : null;
}

export const ACTIVITY_MODULES = {
  products: "Products",
  reviews: "Reviews",
  inquiries: "Inquiries",
  journal: "Brew Journal",
  promotions: "Promotions",
  kpis: "KPIs",
  roadmap: "Roadmap",
  settings: "Settings",
} as const;
export type ActivityModule = keyof typeof ACTIVITY_MODULES;

/** Record who changed what. Never throws: logging must not fail the action. */
export async function logActivity(entry: {
  actorId: string | null;
  module: ActivityModule;
  action: string;
  summary: string;
  entityId?: string | null;
}): Promise<void> {
  try {
    await db.insert(activityLogTable).values({
      id: crypto.randomUUID(),
      actorId: entry.actorId,
      module: entry.module,
      action: entry.action,
      entityId: entry.entityId ?? null,
      summary: entry.summary.slice(0, 500),
    });
  } catch (error) {
    console.error("[activity] log failed:", error);
  }
}

/** Zod issues → { "a.b": "message" } (first message per path). */
export function fieldErrorsOf(issues: readonly { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path.map(String).join(".") || "form";
    out[k] ??= i.message;
  }
  return out;
}
