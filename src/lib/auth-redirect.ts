import type { NextRequest } from "next/server";

import { getConfiguredAppUrl, getRequestOrigin } from "@/lib/app-url";

export const AUTH_NEXT_COOKIE = "oauth-next-path";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://wellness-brew.vercel.app",
  "https://wellnessgroupgh.com",
  "https://www.wellnessgroupgh.com",
];

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

function getAllowedOAuthOrigins(): string[] {
  const fromEnv = process.env.AUTH_ALLOWED_ORIGINS;
  const extra = fromEnv
    ? fromEnv.split(/[\s,;]+/).map((o) => stripTrailingSlash(o.trim()))
    : [];

  const configured = getConfiguredAppUrl();
  const merged = [...DEFAULT_ALLOWED_ORIGINS, ...extra];
  if (configured) {
    merged.push(configured);
  }

  return [...new Set(merged.filter(Boolean))];
}

export function isAllowedOAuthOrigin(origin: string): boolean {
  try {
    const normalized = stripTrailingSlash(origin);
    return getAllowedOAuthOrigins().some((allowed) => allowed === normalized);
  } catch {
    return false;
  }
}

/**
 * Origin used in Supabase `redirectTo`. Must match an entry in Supabase
 * Authentication → Redirect URLs (use `https://your-domain/**` wildcard).
 */
export function getOAuthCallbackOrigin(
  request: NextRequest,
  clientOrigin?: string | null,
): string {
  if (clientOrigin && isAllowedOAuthOrigin(clientOrigin)) {
    return stripTrailingSlash(clientOrigin);
  }

  const configured = getConfiguredAppUrl();
  if (configured && !configured.includes("localhost")) {
    return configured;
  }

  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const fromRequest = getRequestOrigin(request);
  if (!fromRequest.includes("localhost")) {
    return fromRequest;
  }

  return configured ?? fromRequest;
}

/** Production URL for recovering OAuth when Supabase sends users to localhost. */
export function getProductionOAuthRecoveryOrigin(): string | undefined {
  const configured = getConfiguredAppUrl();
  if (configured && !configured.includes("localhost")) {
    return configured;
  }
  return undefined;
}
