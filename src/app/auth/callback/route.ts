import { NextResponse } from "next/server";

import { getRequestOrigin } from "@/lib/app-url";
import { syncUserFromSupabase } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getRequestOrigin(request);
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

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_callback_error`);
}
