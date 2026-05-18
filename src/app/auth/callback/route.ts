import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/app-url";
import { AUTH_NEXT_COOKIE } from "@/lib/auth-redirect";
import { syncUserFromSupabase } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const nextFromCookie = cookieStore.get(AUTH_NEXT_COOKIE)?.value;
  const next = searchParams.get("next") ?? nextFromCookie ?? "/";

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(
        `${origin}/auth/sign-in?error=supabase_not_configured`,
      );
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          await syncUserFromSupabase(user);
        } catch (syncError) {
          console.error("Failed to sync user after OAuth callback:", syncError);
          return NextResponse.redirect(
            `${origin}/auth/sign-in?error=user_sync_failed`,
          );
        }
      }

      const successRedirect = NextResponse.redirect(`${origin}${next}`);
      successRedirect.cookies.delete(AUTH_NEXT_COOKIE);
      return successRedirect;
    }
  }

  const errorRedirect = NextResponse.redirect(
    `${origin}/auth/sign-in?error=auth_callback_error`,
  );
  errorRedirect.cookies.delete(AUTH_NEXT_COOKIE);
  return errorRedirect;
}
