"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { productTable, reviewTable } from "@/db/schema";
import { fieldErrorsOf } from "@/lib/activity";
import { rateLimit } from "@/lib/orders/server/rate-limit";

const reviewSchema = z.object({
  productId: z.string().trim().min(1, "Choose a tea").max(64),
  name: z.string().trim().min(2, "Enter your name").max(80),
  location: z.string().trim().max(80).default(""),
  rating: z.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(2000),
  orderNumber: z.string().trim().max(40).default(""),
  consent: z.literal(true, { message: "Please tick the box so we can publish your review" }),
  /** Honeypot: real people never fill this. */
  website: z.string().max(0).optional().default(""),
});

export type ReviewResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitReview(raw: unknown): Promise<ReviewResult> {
  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const input = parsed.data;
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  if (ip !== "unknown" && !(await rateLimit(`review:ip:${ip}`, 5, 3600))) {
    return { ok: false, error: "Too many reviews in a short time. Please try again later." };
  }
  try {
    const [product] = await db
      .select({ id: productTable.id })
      .from(productTable)
      .where(eq(productTable.id, input.productId))
      .limit(1);
    if (!product) return { ok: false, error: "That tea is no longer available.", fieldErrors: { productId: "Choose a tea" } };
    await db.insert(reviewTable).values({
      id: crypto.randomUUID(),
      productId: product.id,
      name: input.name,
      location: input.location || null,
      rating: input.rating,
      title: input.title || null,
      body: input.body,
      consent: true,
      status: "pending",
      orderNumber: input.orderNumber || null,
    });
    return { ok: true };
  } catch (error) {
    console.error("[review] submit failed:", error);
    return { ok: false, error: "We couldn't save your review. Please try again." };
  }
}
