import { NextResponse } from "next/server";

import { syncUserFromSupabase } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_callback_error`);
}
