import "server-only";

import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isSupabaseAdminConfigured() {
  return getSupabaseAdminClient() !== null;
}

export async function deleteSupabaseAuthUser(userId: string) {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return {
      success: false as const,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in .env to remove users from Supabase Auth.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    return { success: false as const, error: error.message };
  }

  return { success: true as const };
}
