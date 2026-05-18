import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

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

function isAuthUserNotFoundError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("not found") ||
    lower.includes("user_not_found") ||
    lower.includes("does not exist")
  );
}

export async function listAllSupabaseAuthUsers(): Promise<
  | { ok: true; users: User[] }
  | { ok: false; error: string; users: User[] }
> {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in .env to sync customers with Supabase Auth.",
      users: [],
    };
  }

  const all: User[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { ok: false, error: error.message, users: [] };
    }

    all.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }
    page += 1;
  }

  return { ok: true, users: all };
}

export async function deleteSupabaseAuthUser(userId: string) {
  const admin = getSupabaseAdminClient();

  if (!admin) {
    return {
      success: false as const,
      notFound: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it in .env to remove users from Supabase Auth.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    if (isAuthUserNotFoundError(error.message)) {
      return { success: true as const, notFound: true };
    }
    return { success: false as const, notFound: false, error: error.message };
  }

  return { success: true as const, notFound: false };
}
