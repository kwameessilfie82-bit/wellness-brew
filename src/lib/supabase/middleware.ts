import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getProductionOAuthRecoveryOrigin } from "@/lib/auth-redirect";
import { getSupabaseEnv } from "@/lib/supabase/env";

/** Supabase sometimes lands OAuth on `/` instead of `/auth/callback`. */
function redirectOAuthCodeToCallback(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.pathname.startsWith("/auth/callback")) {
    return null;
  }

  const host = request.nextUrl.hostname;
  const isLocal =
    host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");

  if (isLocal) {
    const production = getProductionOAuthRecoveryOrigin();
    if (production) {
      const target = new URL("/auth/callback", production);
      request.nextUrl.searchParams.forEach((value, key) => {
        target.searchParams.set(key, value);
      });
      return NextResponse.redirect(target);
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  const oauthRedirect = redirectOAuthCodeToCallback(request);
  if (oauthRedirect) {
    return oauthRedirect;
  }

  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();

  return supabaseResponse;
}
