import "server-only";

import { createHash } from "node:crypto";

import { absoluteUrl } from "@/lib/seo/site";

/**
 * Meta Conversions API. Active only when the Pixel ID is set in Settings →
 * Tracking AND the server env has META_CAPI_TOKEN (never stored in the DB or
 * shown in the UI). Uses the same event id as the browser Pixel so Meta
 * de-duplicates. Never throws.
 */
const GRAPH_VERSION = "v21.0";

const sha256 = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export function capiConfigured(): boolean {
  return Boolean(process.env.META_CAPI_TOKEN);
}

export async function sendCapiEvent(opts: {
  pixelId: string;
  eventName: string;
  eventId: string;
  path?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  value?: number | null;
  productIds?: string[];
  /** E.164 digits, hashed before sending. */
  phone?: string | null;
}): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !opts.pixelId) return;
  try {
    const user_data: Record<string, unknown> = {};
    if (opts.ip && opts.ip !== "unknown") user_data.client_ip_address = opts.ip;
    if (opts.userAgent) user_data.client_user_agent = opts.userAgent;
    if (opts.phone) user_data.ph = [sha256(opts.phone.replace(/\D/g, ""))];
    const body = {
      data: [
        {
          event_name: opts.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: opts.eventId,
          action_source: "website",
          event_source_url: absoluteUrl(opts.path || "/"),
          user_data,
          custom_data: {
            ...(opts.value != null ? { value: opts.value, currency: "GHS" } : {}),
            ...(opts.productIds?.length ? { content_ids: opts.productIds, content_type: "product" } : {}),
          },
        },
      ],
      ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
    };
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(opts.pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) console.error("[capi] rejected:", res.status, (await res.text()).slice(0, 300));
  } catch (error) {
    console.error("[capi] failed:", error);
  }
}
