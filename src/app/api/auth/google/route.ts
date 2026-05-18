import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_NEXT_COOKIE,
  getOAuthCallbackOrigin,
} from "@/lib/auth-redirect";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Starts Google OAuth on the server.
 *
 * Supabase Dashboard → Authentication → URL Configuration:
 *   Site URL: https://wellness-brew.vercel.app  (NOT localhost)
 *   Redirect URLs: https://wellness-brew.vercel.app/**
 *                   http://localhost:3000/**
 */
export async function GET(request: NextRequest) {
  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 },
    );
  }

  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const clientOrigin = request.nextUrl.searchParams.get("origin");
  const origin = getOAuthCallbackOrigin(request, clientOrigin);

  // Exact path only — query strings on redirectTo often fail Supabase allow-list checks.
  const redirectTo = `${origin}/auth/callback`;

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

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      redirectTo,
    },
  });

  if (error || !data.url) {
    console.error("OAuth start failed:", error?.message, { redirectTo, origin });
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=oauth_start_failed`,
    );
  }

  const redirectResponse = NextResponse.redirect(data.url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  const safeNext = next.startsWith("/") ? next : "/";
  redirectResponse.cookies.set(AUTH_NEXT_COOKIE, safeNext, {
    httpOnly: true,
    maxAge: 600,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });

  return redirectResponse;
}
