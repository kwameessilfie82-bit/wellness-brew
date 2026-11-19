"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { promoCodeTable } from "@/db/schema";
import { fieldErrorsOf, logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";
import { DISCOUNT_TYPES, normalizeCode, PROMO_KINDS } from "@/lib/promotions/compute";

const dateOrNull = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use YYYY-MM-DD")
  .transform((v) => v || null);

const promoSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeCode)
      .pipe(z.string().regex(/^[A-Z0-9_-]{3,40}$/, "3–40 letters, numbers, - or _")),
    kind: z.enum(PROMO_KINDS),
    discountType: z.enum(DISCOUNT_TYPES),
    value: z.number().positive("Must be more than 0").max(100_000),
    minSubtotal: z.number().min(0).max(1_000_000),
    bundleProductIds: z.array(z.string().min(1).max(64)).max(20),
    startsOn: dateOrNull,
    endsOn: dateOrNull,
    maxUses: z.number().int().min(1).max(1_000_000).nullable(),
    referrerName: z.string().trim().max(120),
    referrerPhone: z.string().trim().max(30),
    note: z.string().trim().max(500),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "percent" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Max 100%" });
    if (v.kind === "bundle" && v.bundleProductIds.length < 2) {
      ctx.addIssue({ code: "custom", path: ["bundleProductIds"], message: "Pick at least 2 products" });
    }
    if (v.kind === "referral" && !v.referrerName) {
      ctx.addIssue({ code: "custom", path: ["referrerName"], message: "Who is this code for?" });
    }
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) {
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "Ends before it starts" });
    }
  });

export type PromoInput = z.input<typeof promoSchema>;

// Dates are whole days in Ghana (UTC+0): valid from 00:00 on the start day to 23:59:59 on the end day.
const dayStart = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`) : null);
const dayEnd = (d: string | null) => (d ? new Date(`${d}T23:59:59Z`) : null);

export async function savePromo(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminPermission("canManageSettings");
  if (!admin) return { ok: false, error: "Only managers can manage promotions." };
  const parsed = promoSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const v = parsed.data;
  const values = {
    code: v.code,
    kind: v.kind,
    discountType: v.discountType,
    value: v.value.toFixed(2),
    minSubtotal: v.minSubtotal.toFixed(2),
    bundleProductIds: v.kind === "bundle" ? v.bundleProductIds : [],
    startsAt: dayStart(v.startsOn),
    endsAt: dayEnd(v.endsOn),
    maxUses: v.maxUses,
    referrerName: v.referrerName || null,
    referrerPhone: v.referrerPhone || null,
    note: v.note || null,
    isActive: v.isActive,
    updatedAt: new Date(),
  };
  try {
    let savedId = id;
    if (id) {
      const rows = await db.update(promoCodeTable).set(values).where(eq(promoCodeTable.id, id)).returning({ id: promoCodeTable.id });
      if (rows.length === 0) return { ok: false, error: "Code not found." };
    } else {
      savedId = crypto.randomUUID();
      await db.insert(promoCodeTable).values({ id: savedId, ...values, createdBy: admin.id });
    }
    await logActivity({
      actorId: admin.id,
      module: "promotions",
      action: id ? "updated" : "created",
      entityId: savedId,
      summary: `${id ? "Updated" : "Created"} ${v.kind} code ${v.code}${v.isActive ? "" : " (inactive)"}`,
    });
    revalidatePath("/admin/promotions");
    return { ok: true, id: savedId! };
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return { ok: false, error: "That code already exists.", fieldErrors: { code: "Already used" } };
    }
    console.error("[promotions] save failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function setPromoActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageSettings");
  if (!admin) return { ok: false, error: "Only managers can manage promotions." };
  const [row] = await db
    .update(promoCodeTable)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(promoCodeTable.id, id))
    .returning({ code: promoCodeTable.code });
  if (!row) return { ok: false, error: "Code not found." };
  await logActivity({
    actorId: admin.id,
    module: "promotions",
    action: isActive ? "activated" : "deactivated",
    entityId: id,
    summary: `${isActive ? "Activated" : "Deactivated"} code ${row.code}`,
  });
  revalidatePath("/admin/promotions");
  return { ok: true };
}
