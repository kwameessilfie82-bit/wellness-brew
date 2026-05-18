import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/app-url";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Starts Google OAuth on the server so `redirectTo` uses the real request host
 * (e.g. https://wellness-brew.vercel.app), not a stale build-time env value.
 *
 * Supabase Dashboard → Authentication → URL Configuration must include:
 *   Site URL: https://wellness-brew.vercel.app
 *   Redirect URLs: https://wellness-brew.vercel.app/auth/callback
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
  const origin = getRequestOrigin(request);
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

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
    console.error("OAuth start failed:", error?.message, { redirectTo });
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=oauth_start_failed`,
    );
  }

  const redirectResponse = NextResponse.redirect(data.url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}
