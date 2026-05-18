const LOCALHOST_FALLBACK = "http://localhost:3000";

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

/** Canonical public site URL from env (set in Vercel for production). */
export function getConfiguredAppUrl(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_SERVER_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined);

  return raw ? stripTrailingSlash(raw) : undefined;
}

/** Origin for server redirects (OAuth callback, emails, etc.). */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const configured = getConfiguredAppUrl();
  if (configured && !configured.includes("localhost")) {
    return configured;
  }

  return new URL(request.url).origin;
}

/**
 * Origin passed to Supabase as `redirectTo` during OAuth.
 * Prefer the live browser origin in production; never send users to localhost
 * from a deployed site even if env was built with a local URL.
 */
export function getOAuthRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    const live = window.location.origin;
    const configured = getConfiguredAppUrl();

    if (live.includes("localhost")) {
      return live;
    }

    if (configured && !configured.includes("localhost")) {
      return configured;
    }

    return live;
  }

  return getConfiguredAppUrl() ?? LOCALHOST_FALLBACK;
}
