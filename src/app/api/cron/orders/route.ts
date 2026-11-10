import { NextResponse } from "next/server";

import { runHousekeeping } from "@/lib/orders/server/housekeeping";

export const dynamic = "force-dynamic";

/**
 * Daily Vercel Cron (vercel.json). Expiry also runs lazily whenever staff open
 * the orders inbox, so it doesn't depend on cron frequency (Hobby = daily).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  // Fail closed in production when the secret isn't configured.
  if ((!secret && process.env.NODE_ENV === "production") || (secret && request.headers.get("authorization") !== `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runHousekeeping();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/orders] failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
