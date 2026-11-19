"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { kpiEntryTable } from "@/db/schema";
import { fieldErrorsOf, logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";
import { isMetricKey, isWeekStart } from "@/lib/kpis/config";

const schema = z.object({
  week: z.string().refine(isWeekStart, "Pick the Monday that starts the week"),
  values: z
    .record(z.string().refine(isMetricKey, "Unknown metric"), z.number().min(0, "Cannot be negative").max(1_000_000_000_000).nullable())
    .refine((v) => Object.keys(v).length <= 100, "Too many values"),
});

/** Upsert numbers; keys set to null are deleted. */
export async function saveKpiWeek(weekStart: string, values: Record<string, number | null>): Promise<ActionResult<{ saved: number }>> {
  const admin = await requireAdminPermission("canViewAnalytics");
  if (!admin) return { ok: false, error: "You do not have permission to change KPIs." };
  const parsed = schema.safeParse({ week: weekStart, values });
  if (!parsed.success) {
    return { ok: false, error: "Please check the numbers.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const entries = Object.entries(parsed.data.values);
  const keep = entries.filter((e): e is [string, number] => e[1] !== null && Number.isFinite(e[1]));
  const drop = entries.filter(([, v]) => v === null).map(([k]) => k);
  try {
    await db.transaction(async (tx) => {
      if (keep.length) {
        await tx
          .insert(kpiEntryTable)
          .values(keep.map(([metric, v]) => ({ weekStart, metric, value: v.toFixed(2), updatedBy: admin.id })))
          .onConflictDoUpdate({
            target: [kpiEntryTable.weekStart, kpiEntryTable.metric],
            set: { value: sql`excluded.value`, updatedBy: admin.id, updatedAt: new Date() },
          });
      }
      if (drop.length) {
        await tx.delete(kpiEntryTable).where(and(eq(kpiEntryTable.weekStart, weekStart), inArray(kpiEntryTable.metric, drop)));
      }
    });
    await logActivity({
      actorId: admin.id,
      module: "kpis",
      action: "save",
      entityId: weekStart,
      summary: `Saved KPIs for week of ${weekStart} (${keep.length} values${drop.length ? `, ${drop.length} cleared` : ""})`,
    });
    revalidatePath("/admin/kpis");
    return { ok: true, saved: keep.length };
  } catch (error) {
    console.error("[kpis] save failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}
