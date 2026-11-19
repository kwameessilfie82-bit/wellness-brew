import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { siteEventTable } from "@/db/schema";
import { rateLimit } from "@/lib/orders/server/rate-limit";
import { getPublicSettings } from "@/lib/settings/get";
import { sendCapiEvent } from "@/lib/tracking/capi";
import { META_NAMES, STORED_EVENTS } from "@/lib/tracking/events";

const CAPI_FROM_BEACON = new Set(["view_item", "add_to_cart", "begin_checkout", "whatsapp_click"]);

const short = (n: number) => z.string().trim().max(n).optional();

const eventSchema = z.object({
  name: z.enum(STORED_EVENTS as unknown as [string, ...string[]]),
  eventId: z.string().uuid().optional(),
  path: short(300),
  productId: short(64),
  value: z.number().min(0).max(1_000_000).optional(),
  variant: short(20),
  utm: z.object({ source: short(60), medium: short(60), campaign: short(80) }).partial().optional(),
});

/** First-party analytics beacon. Stores the event, forwards to Meta CAPI. Always 204. */
export async function POST(request: NextRequest) {
  const noContent = new NextResponse(null, { status: 204 });
  try {
    const parsed = eventSchema.safeParse(await request.json());
    if (!parsed.success) return noContent;
    const e = parsed.data;
    const ip = (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim();
    if (ip !== "unknown" && !(await rateLimit(`events:ip:${ip}`, 300, 3600))) return noContent;

    await db.insert(siteEventTable).values({
      name: e.name,
      path: e.path ?? null,
      productId: e.productId ?? null,
      value: e.value != null ? e.value.toFixed(2) : null,
      variant: e.variant ?? null,
      utmSource: e.utm?.source ?? null,
      utmMedium: e.utm?.medium ?? null,
      utmCampaign: e.utm?.campaign ?? null,
    });

    // Only browse/intent events go to Meta from this unauthenticated beacon.
    // Purchases are sent server-side by placeOrder with the real total.
    const metaName = CAPI_FROM_BEACON.has(e.name) ? META_NAMES[e.name as keyof typeof META_NAMES] : undefined;
    if (metaName && e.eventId && process.env.META_CAPI_TOKEN) {
      const ua = request.headers.get("user-agent");
      const eventId = e.eventId;
      after(async () => {
        const { tracking } = await getPublicSettings();
        await sendCapiEvent({
          pixelId: tracking.metaPixelId,
          eventName: metaName,
          eventId,
          path: e.path,
          ip,
          userAgent: ua,
          value: null,
          productIds: e.productId ? [e.productId] : undefined,
        });
      });
    }
  } catch (error) {
    console.error("[events] failed:", error);
  }
  return noContent;
}
