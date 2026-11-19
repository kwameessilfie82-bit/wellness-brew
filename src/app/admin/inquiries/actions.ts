"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { inquiryTable } from "@/db/schema";
import { fieldErrorsOf, logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";

const DENIED = "You don't have permission to manage inquiries.";

const updateSchema = z.object({
  status: z.enum(["new", "contacted", "quoted", "won", "lost"]).optional(),
  staffNotes: z.string().trim().max(2000, "Notes can be at most 2000 characters").optional(),
});

export async function updateInquiry(id: string, raw: unknown): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageOrders");
  if (!admin) return { ok: false, error: DENIED };
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const { status, staffNotes } = parsed.data;
  if (status === undefined && staffNotes === undefined) return { ok: true };
  try {
    const [row] = await db
      .update(inquiryTable)
      .set({
        ...(status !== undefined ? { status } : {}),
        ...(staffNotes !== undefined ? { staffNotes: staffNotes || null } : {}),
        updatedAt: new Date(),
      })
      .where(eq(inquiryTable.id, id))
      .returning({ name: inquiryTable.name });
    if (!row) return { ok: false, error: "Inquiry not found." };
    await logActivity({
      actorId: admin.id,
      module: "inquiries",
      action: status !== undefined ? "status_changed" : "notes_updated",
      entityId: id,
      summary: status !== undefined ? `Inquiry from ${row.name} → ${status}` : `Updated notes on inquiry from ${row.name}`,
    });
    return { ok: true };
  } catch (error) {
    console.error("[inquiries] update failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function deleteInquiry(id: string): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageOrders");
  if (!admin) return { ok: false, error: DENIED };
  try {
    const [row] = await db.delete(inquiryTable).where(eq(inquiryTable.id, id)).returning({ name: inquiryTable.name });
    if (!row) return { ok: false, error: "Inquiry not found." };
    await logActivity({
      actorId: admin.id,
      module: "inquiries",
      action: "deleted",
      entityId: id,
      summary: `Deleted inquiry from ${row.name}`,
    });
    return { ok: true };
  } catch (error) {
    console.error("[inquiries] delete failed:", error);
    return { ok: false, error: "Could not delete. Try again." };
  }
}
