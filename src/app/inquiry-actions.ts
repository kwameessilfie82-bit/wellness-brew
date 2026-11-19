"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { inquiryTable } from "@/db/schema";
import { fieldErrorsOf } from "@/lib/activity";
import { normalizePhone } from "@/lib/orders/phone";
import { rateLimit } from "@/lib/orders/server/rate-limit";

const opt = (n: number) => z.string().trim().max(n).default("");

const inquirySchema = z
  .object({
    kind: z.enum(["gifting", "stockist", "general"]),
    name: z.string().trim().min(2, "Enter your name").max(120),
    company: opt(160),
    phone: opt(30),
    email: z
      .string()
      .trim()
      .max(200)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Invalid email" })
      .default(""),
    message: opt(3000),
    /** Free-form extras per form (tier, quantity, date, business type…). */
    details: z.record(z.string().max(40), z.string().trim().max(300)).default({}),
    source: opt(120),
    website: z.string().max(0).optional().default(""),
  })
  .refine((v) => v.phone || v.email, { message: "Give us a phone number or email", path: ["phone"] });

export type InquiryResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function submitInquiry(raw: unknown): Promise<InquiryResult> {
  const parsed = inquirySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error.issues) };
  }
  const v = parsed.data;
  if (v.phone && !normalizePhone(v.phone)) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: { phone: "Enter a valid phone number" } };
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  if (ip !== "unknown" && !(await rateLimit(`inquiry:ip:${ip}`, 8, 3600))) {
    return { ok: false, error: "Too many requests. Please message us on WhatsApp instead." };
  }
  try {
    await db.insert(inquiryTable).values({
      id: crypto.randomUUID(),
      kind: v.kind,
      name: v.name,
      company: v.company || null,
      phone: v.phone || null,
      email: v.email || null,
      message: v.message || null,
      details: Object.fromEntries(Object.entries(v.details).slice(0, 12).filter(([, x]) => x)),
      source: v.source || null,
    });
    return { ok: true };
  } catch (error) {
    console.error("[inquiry] submit failed:", error);
    return { ok: false, error: "We couldn't send your request. Please try again or message us on WhatsApp." };
  }
}
