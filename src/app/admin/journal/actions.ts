"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { postTable } from "@/db/schema";
import { fieldErrorsOf, logActivity, requireAdminPermission, type ActionResult } from "@/lib/activity";
import { slugify } from "@/lib/journal/utils";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160, "Max 160 characters"),
  slug: z.string().trim().toLowerCase().max(120, "Max 120 characters"),
  excerpt: z.string().trim().max(300, "Max 300 characters"),
  coverUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//i.test(v), "Use /path or https://"),
  body: z.string().max(50000, "Max 50,000 characters"),
  seoTitle: z.string().trim().max(70, "Max 70 characters"),
  seoDescription: z.string().trim().max(170, "Max 170 characters"),
  status: z.enum(["draft", "published"]),
});

export type PostInput = z.input<typeof postSchema>;

function revalidateJournal() {
  revalidatePath("/journal");
  revalidatePath("/journal/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

export async function savePost(id: string | null, raw: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminPermission("canManageProducts");
  if (!admin) return { ok: false, error: "You don't have permission to edit the journal." };
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const d = parsed.data;
  const slug = d.slug || slugify(d.title);
  if (!slug || !slugRe.test(slug)) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { slug: "Lowercase letters, numbers and dashes only" },
    };
  }

  const values = {
    slug,
    title: d.title,
    excerpt: d.excerpt || null,
    coverUrl: d.coverUrl || null,
    body: d.body,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
    status: d.status,
    updatedAt: new Date(),
  };

  try {
    let postId = id;
    if (id) {
      const [existing] = await db
        .select({ publishedAt: postTable.publishedAt })
        .from(postTable)
        .where(eq(postTable.id, id))
        .limit(1);
      if (!existing) return { ok: false, error: "Post not found." };
      const publishedAt = d.status === "published" && !existing.publishedAt ? new Date() : existing.publishedAt;
      await db.update(postTable).set({ ...values, publishedAt }).where(eq(postTable.id, id));
    } else {
      postId = crypto.randomUUID();
      await db.insert(postTable).values({
        id: postId,
        ...values,
        publishedAt: d.status === "published" ? new Date() : null,
        authorId: admin.id,
      });
    }
    await logActivity({
      actorId: admin.id,
      module: "journal",
      action: id ? "updated" : "created",
      entityId: postId,
      summary: `${id ? "Updated" : "Created"} journal post "${d.title}" (${d.status})`,
    });
    revalidateJournal();
    return { ok: true, id: postId as string };
  } catch (error) {
    const code = (error as { code?: string; cause?: { code?: string } })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { slug: "Already used" } };
    }
    console.error("[journal] save failed:", error);
    return { ok: false, error: "Could not save. Try again." };
  }
}

export async function deletePost(id: string): Promise<ActionResult> {
  const admin = await requireAdminPermission("canManageProducts");
  if (!admin) return { ok: false, error: "You don't have permission to edit the journal." };
  try {
    const [row] = await db.delete(postTable).where(eq(postTable.id, id)).returning({ title: postTable.title });
    if (!row) return { ok: false, error: "Post not found." };
    await logActivity({
      actorId: admin.id,
      module: "journal",
      action: "deleted",
      entityId: id,
      summary: `Deleted journal post "${row.title}"`,
    });
    revalidateJournal();
    return { ok: true };
  } catch (error) {
    console.error("[journal] delete failed:", error);
    return { ok: false, error: "Could not delete. Try again." };
  }
}
