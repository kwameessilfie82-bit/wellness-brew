import { NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const CORS_ALLOWED_ORIGINS = new Set([
  "https://www.wellnessgroupgh.com",
  "https://wellnessgroupgh.com",
  "http://localhost:3000",
  "https://wellness-brew.vercel.app",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
  "Access-Control-Allow-Credentials": "true",
} as const;

export async function proxy(request: NextRequest) {
  const isApi = request.nextUrl.pathname.startsWith("/api/");
  const origin = request.headers.get("origin");
  const corsAllowed = !!origin && CORS_ALLOWED_ORIGINS.has(origin);

  // Preflight: answer before touching the session. Unknown origins get no
  // CORS headers, so the browser blocks the cross-origin request.
  if (isApi && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: corsAllowed ? 204 : 403,
      headers: corsAllowed
        ? {
            ...CORS_HEADERS,
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Max-Age": "86400",
            Vary: "Origin",
          }
        : { Vary: "Origin" },
    });
  }

  const response = await updateSession(request);

  if (isApi && corsAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    for (const [k, v] of Object.entries(CORS_HEADERS)) response.headers.set(k, v);
    response.headers.append("Vary", "Origin");
  }

  return response;
}

export const config = {
  matcher: [
    // Crawl/metadata files skip the Supabase session refresh entirely.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|icon|apple-icon|opengraph-image|twitter-image|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
