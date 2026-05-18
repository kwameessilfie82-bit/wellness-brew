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

/** Base URL for server-side fetches and redirects. */
export function getAppBaseUrl(request?: Request): string {
  if (request) {
    return getRequestOrigin(request);
  }

  const configured = getConfiguredAppUrl();
  if (configured) {
    return configured;
  }

  return LOCALHOST_FALLBACK;
}

/** Origin from an incoming HTTP request (Vercel sets x-forwarded-host). */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
    "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0]?.trim()}`;
  }

  const host = request.headers.get("host");
  if (host && !host.includes("localhost")) {
    const proto = host.includes("localhost") ? "http" : "https";
    return `${proto}://${host}`;
  }

  const configured = getConfiguredAppUrl();
  if (configured && !configured.includes("localhost")) {
    return configured;
  }

  return new URL(request.url).origin;
}

/** @deprecated Use /api/auth/google — client OAuth kept for compatibility. */
export function getOAuthRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return getConfiguredAppUrl() ?? LOCALHOST_FALLBACK;
}
