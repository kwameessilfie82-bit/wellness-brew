"use server";

import { desc, eq } from "drizzle-orm";
import { updateTag } from "next/cache";

import { db } from "@/db";
import { settingAuditTable, siteSettingTable, userTable, adminUserTable } from "@/db/schema";
import { hasPermission, isAdmin } from "@/lib/admin-auth";
import { settingsTag } from "@/lib/settings/get";
import { isSettingsSection, SETTINGS_SCHEMAS } from "@/lib/settings/registry";
import type { SettingsSection } from "@/lib/settings/schemas";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function requireSettingsManager() {
  const adminUser = await isAdmin();
  if (!adminUser || !hasPermission(adminUser, "canManageSettings")) return null;
  return adminUser;
}

/** Invalidate cached reads. Non-fatal: the data is already committed. */
function invalidate(section: SettingsSection) {
  try {
    updateTag(settingsTag(section));
  } catch (error) {
    console.error(`[settings] cache invalidation for "${section}" failed:`, error);
  }
}

async function writeSection(section: SettingsSection, value: unknown, adminUserId: string) {
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ value: siteSettingTable.value })
      .from(siteSettingTable)
      .where(eq(siteSettingTable.key, section))
      .for("update");
    const now = new Date();
    await tx
      .insert(siteSettingTable)
      .values({ key: section, value, updatedBy: adminUserId, updatedAt: now })
      .onConflictDoUpdate({
        target: siteSettingTable.key,
        set: { value, updatedBy: adminUserId, updatedAt: now },
      });
    await tx.insert(settingAuditTable).values({
      id: crypto.randomUUID(),
      key: section,
      before: current?.value ?? null,
      after: value,
      changedBy: adminUserId,
      changedAt: now,
    });
  });
  invalidate(section);
}

export async function saveSettings(section: string, data: unknown): Promise<ActionResult> {
  const adminUser = await requireSettingsManager();
  if (!adminUser) return { ok: false, error: "Only managers can change settings." };
  if (!isSettingsSection(section)) return { ok: false, error: "Unknown settings section." };

  const parsed = SETTINGS_SCHEMAS[section].safeParse(data);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    await writeSection(section, parsed.data, adminUser.id);
    return { ok: true };
  } catch (error) {
    console.error("[settings] save failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

/** Restore the value a section had *before* the given change. */
export async function revertSettingChange(auditId: string): Promise<ActionResult> {
  const adminUser = await requireSettingsManager();
  if (!adminUser) return { ok: false, error: "Only managers can change settings." };

  try {
    const result = await db.transaction(async (tx): Promise<ActionResult & { section?: SettingsSection }> => {
      const [entry] = await tx
        .select()
        .from(settingAuditTable)
        .where(eq(settingAuditTable.id, auditId))
        .limit(1);
      if (!entry || !isSettingsSection(entry.key)) return { ok: false, error: "Change not found." };
      const section = entry.key;

      const [current] = await tx
        .select({ value: siteSettingTable.value })
        .from(siteSettingTable)
        .where(eq(siteSettingTable.key, section))
        .for("update");
      const now = new Date();

      let after: unknown;
      if (entry.before == null) {
        // Section was at defaults before this change: remove the row.
        await tx.delete(siteSettingTable).where(eq(siteSettingTable.key, section));
        after = { __reset: true };
      } else {
        const parsed = SETTINGS_SCHEMAS[section].safeParse(entry.before);
        if (!parsed.success) return { ok: false, error: "That old version is no longer valid." };
        after = parsed.data;
        await tx
          .insert(siteSettingTable)
          .values({ key: section, value: after, updatedBy: adminUser.id, updatedAt: now })
          .onConflictDoUpdate({
            target: siteSettingTable.key,
            set: { value: after, updatedBy: adminUser.id, updatedAt: now },
          });
      }
      await tx.insert(settingAuditTable).values({
        id: crypto.randomUUID(),
        key: section,
        before: current?.value ?? null,
        after,
        changedBy: adminUser.id,
        changedAt: now,
      });
      return { ok: true, section };
    });
    if (result.ok && result.section) invalidate(result.section);
    return result.ok ? { ok: true } : result;
  } catch (error) {
    console.error("[settings] revert failed:", error);
    return { ok: false, error: "Could not revert. Try again." };
  }
}

export interface SettingHistoryEntry {
  id: string;
  key: string;
  changedAt: string;
  changedByName: string | null;
  isReset: boolean;
}

/** Latest 50 changes (all sections), newest first. */
export async function getSettingHistory(): Promise<SettingHistoryEntry[]> {
  const adminUser = await requireSettingsManager();
  if (!adminUser) return [];
  const rows = await db
    .select({
      id: settingAuditTable.id,
      key: settingAuditTable.key,
      after: settingAuditTable.after,
      changedAt: settingAuditTable.changedAt,
      name: userTable.name,
      email: userTable.email,
    })
    .from(settingAuditTable)
    .leftJoin(adminUserTable, eq(adminUserTable.id, settingAuditTable.changedBy))
    .leftJoin(userTable, eq(userTable.id, adminUserTable.userId))
    .orderBy(desc(settingAuditTable.changedAt))
    .limit(50);
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    changedAt: r.changedAt.toISOString(),
    changedByName: r.name || r.email || null,
    isReset: !!(r.after && typeof r.after === "object" && "__reset" in r.after),
  }));
}
