"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { reviewTable } from "@/db/schema";
import { logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";
import { revalidateCatalog } from "@/lib/products/revalidate";

const DENIED = "You don't have permission to moderate reviews.";

export async function moderateReview(
  id: string,
  status: "approved" | "rejected" | "pending",
): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageProducts");
  if (!admin) return { ok: false, error: DENIED };
  if (!["approved", "rejected", "pending"].includes(status)) return { ok: false, error: "Invalid status." };
  try {
    const [row] = await db
      .update(reviewTable)
      .set({
        status,
        // Only approved reviews can be featured.
        ...(status === "approved" ? {} : { isFeatured: false }),
        moderatedBy: admin.id,
        moderatedAt: new Date(),
      })
      .where(eq(reviewTable.id, id))
      .returning({ name: reviewTable.name, rating: reviewTable.rating });
    if (!row) return { ok: false, error: "Review not found." };
    await logActivity({
      actorId: admin.id,
      module: "reviews",
      action: status,
      entityId: id,
      summary: `Review from ${row.name} (${row.rating} stars) → ${status}`,
    });
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    console.error("[reviews] moderate failed:", error);
    return { ok: false, error: "Could not update the review. Try again." };
  }
}

export async function setReviewFeatured(id: string, featured: boolean): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageProducts");
  if (!admin) return { ok: false, error: DENIED };
  try {
    const [row] = await db
      .update(reviewTable)
      .set({ isFeatured: featured, moderatedBy: admin.id, moderatedAt: new Date() })
      .where(and(eq(reviewTable.id, id), eq(reviewTable.status, "approved")))
      .returning({ name: reviewTable.name });
    if (!row) return { ok: false, error: "Only approved reviews can be featured." };
    await logActivity({
      actorId: admin.id,
      module: "reviews",
      action: featured ? "featured" : "unfeatured",
      entityId: id,
      summary: `${featured ? "Featured" : "Unfeatured"} review from ${row.name}`,
    });
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    console.error("[reviews] feature failed:", error);
    return { ok: false, error: "Could not update the review. Try again." };
  }
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageProducts");
  if (!admin) return { ok: false, error: DENIED };
  try {
    const [row] = await db.delete(reviewTable).where(eq(reviewTable.id, id)).returning({ name: reviewTable.name });
    if (!row) return { ok: false, error: "Review not found." };
    await logActivity({
      actorId: admin.id,
      module: "reviews",
      action: "deleted",
      entityId: id,
      summary: `Deleted review from ${row.name}`,
    });
    revalidateCatalog();
    return { ok: true };
  } catch (error) {
    console.error("[reviews] delete failed:", error);
    return { ok: false, error: "Could not delete the review. Try again." };
  }
}
