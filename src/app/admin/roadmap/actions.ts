"use server";

import { asc, count, eq, max, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { roadmapItemTable } from "@/db/schema";
import { fieldErrorsOf, logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";
import { ROADMAP_STATUSES } from "@/lib/roadmap/config";
import { ROADMAP_SEED } from "@/lib/roadmap/seed-data";

const text = (n: number) =>
  z
    .string()
    .trim()
    .max(n)
    .transform((v) => v || null);

const itemSchema = z.object({
  action: z.string().trim().min(1, "Describe the action").max(500),
  priority: text(10),
  phase: text(60),
  channel: text(80),
  owner: text(80),
  dueDate: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD")
    .transform((v) => v || null),
  effort: text(20),
  impact: text(20),
  status: z.enum(ROADMAP_STATUSES),
  why: text(1000),
  successMeasure: text(500),
  dependency: text(500),
  notes: text(2000),
});
export type RoadmapItemInput = z.input<typeof itemSchema>;

const DENIED = "You do not have permission to change the roadmap.";
const refresh = () => revalidatePath("/admin/roadmap");

export async function importStarterRoadmap(): Promise<ActionResult<{ imported: number }>> {
  const admin = await requireAdminPermission("canViewAnalytics");
  if (!admin) return { ok: false, error: DENIED };
  try {
    const [{ n }] = await db.select({ n: count() }).from(roadmapItemTable);
    if (n > 0) return { ok: false, error: "The roadmap already has items." };
    await db.insert(roadmapItemTable).values(
      ROADMAP_SEED.map((s, i) => ({
        id: crypto.randomUUID(),
        position: i,
        priority: s.priority,
        phase: s.phase,
        channel: s.channel,
        action: s.action,
        why: s.why,
        owner: s.owner,
        dueDate: s.dueDate,
        effort: s.effort,
        impact: s.impact,
        status: s.status,
        successMeasure: s.successMeasure,
        dependency: s.dependency,
        updatedBy: admin.id,
      })),
    );
    await logActivity({
      actorId: admin.id,
      module: "roadmap",
      action: "import",
      summary: `Imported ${ROADMAP_SEED.length} starter roadmap actions`,
    });
    refresh();
    return { ok: true, imported: ROADMAP_SEED.length };
  } catch (error) {
    console.error("[roadmap] import failed:", error);
    return { ok: false, error: "Could not import the roadmap. Try again." };
  }
}

export async function saveRoadmapItem(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminPermission("canViewAnalytics");
  if (!admin) return { ok: false, error: DENIED };
  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const v = parsed.data;
  try {
    const savedId = id ?? crypto.randomUUID();
    if (id) {
      const rows = await db
        .update(roadmapItemTable)
        .set({ ...v, updatedBy: admin.id, updatedAt: new Date() })
        .where(eq(roadmapItemTable.id, id))
        .returning({ id: roadmapItemTable.id });
      if (rows.length === 0) return { ok: false, error: "Action not found." };
    } else {
      const [{ top }] = await db.select({ top: max(roadmapItemTable.position) }).from(roadmapItemTable);
      await db.insert(roadmapItemTable).values({ id: savedId, ...v, position: (top ?? -1) + 1, updatedBy: admin.id });
    }
    await logActivity({
      actorId: admin.id,
      module: "roadmap",
      action: id ? "update" : "create",
      entityId: savedId,
      summary: `${id ? "Updated" : "Added"} roadmap action: ${v.action}`,
    });
    refresh();
    return { ok: true, id: savedId };
  } catch (error) {
    console.error("[roadmap] save failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function setRoadmapStatus(id: string, status: string): Promise<ActionResult> {
  const admin = await requireAdminPermission("canViewAnalytics");
  if (!admin) return { ok: false, error: DENIED };
  const parsed = z.enum(ROADMAP_STATUSES).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Unknown status." };
  try {
    const rows = await db
      .update(roadmapItemTable)
      .set({ status: parsed.data, updatedBy: admin.id, updatedAt: new Date() })
      .where(eq(roadmapItemTable.id, id))
      .returning({ action: roadmapItemTable.action });
    if (rows.length === 0) return { ok: false, error: "Action not found." };
    await logActivity({
      actorId: admin.id,
      module: "roadmap",
      action: "status",
      entityId: id,
      summary: `Marked "${rows[0].action}" as ${parsed.data}`,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[roadmap] status failed:", error);
    return { ok: false, error: "Could not update the status. Try again." };
  }
}

export async function deleteRoadmapItem(id: string): Promise<ActionResult> {
  const admin = await requireAdminPermission("canViewAnalytics");
  if (!admin) return { ok: false, error: DENIED };
  try {
    const rows = await db
      .delete(roadmapItemTable)
      .where(eq(roadmapItemTable.id, id))
      .returning({ action: roadmapItemTable.action });
    if (rows.length === 0) return { ok: false, error: "Action not found." };
    await logActivity({
      actorId: admin.id,
      module: "roadmap",
      action: "delete",
      entityId: id,
      summary: `Deleted roadmap action: ${rows[0].action}`,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[roadmap] delete failed:", error);
    return { ok: false, error: "Could not delete. Try again." };
  }
}

/** Swap with the neighbouring item in position order. */
export async function moveRoadmapItem(id: string, dir: "up" | "down"): Promise<ActionResult> {
  const admin = await requireAdminPermission("canViewAnalytics");
  if (!admin) return { ok: false, error: DENIED };
  if (dir !== "up" && dir !== "down") return { ok: false, error: "Bad direction." };
  try {
    const ids = (
      await db
        .select({ id: roadmapItemTable.id })
        .from(roadmapItemTable)
        .orderBy(asc(roadmapItemTable.position), asc(roadmapItemTable.createdAt), asc(roadmapItemTable.id))
    ).map((r) => r.id);
    const i = ids.indexOf(id);
    if (i < 0) return { ok: false, error: "Action not found." };
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return { ok: true };
    [ids[i], ids[j]] = [ids[j], ids[i]];
    // Renumber in one statement so duplicate or gappy positions heal themselves.
    const values = sql.join(
      ids.map((x, pos) => sql`(${x}::text, ${pos}::int)`),
      sql`, `,
    );
    await db.execute(
      sql`UPDATE roadmap_item SET position = v.pos FROM (VALUES ${values}) AS v(id, pos) WHERE roadmap_item.id = v.id`,
    );
    refresh();
    return { ok: true };
  } catch (error) {
    console.error("[roadmap] move failed:", error);
    return { ok: false, error: "Could not reorder. Try again." };
  }
}
