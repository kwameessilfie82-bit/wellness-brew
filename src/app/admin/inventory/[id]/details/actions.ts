"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { productTable } from "@/db/schema";
import { fieldErrorsOf, logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";
import { productDetailsSchema } from "@/lib/products/details";
import { revalidateCatalog } from "@/lib/products/revalidate";

export async function saveProductDetails(productId: string, raw: unknown): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageInventory");
  if (!admin) return { ok: false, error: "You don't have permission to edit products." };
  const parsed = productDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  try {
    const [row] = await db
      .update(productTable)
      .set({ details: parsed.data, updatedAt: new Date() })
      .where(eq(productTable.id, productId))
      .returning({ name: productTable.name, slug: productTable.slug });
    if (!row) return { ok: false, error: "Product not found." };
    await logActivity({
      actorId: admin.id,
      module: "products",
      action: "details_updated",
      entityId: productId,
      summary: `Updated product details for ${row.name}`,
    });
    revalidateCatalog();
    revalidatePath(`/shop/${row.slug}`);
    return { ok: true };
  } catch (error) {
    console.error("[product-details] save failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}
