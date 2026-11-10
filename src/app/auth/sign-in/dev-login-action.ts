"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const DEV_EMAIL = "owner@example.com";
const DEV_PASSWORD = "Password123!";

/**
 * DEVELOPMENT ONLY. Makes sure the local owner account exists with a known
 * password, then hands the credentials back for the client to sign in with.
 * Refuses to run in any other environment.
 */
export async function prepareDevLogin(): Promise<{ ok: true; email: string; password: string } | { ok: false; error: string }> {
  if (process.env.NODE_ENV !== "development") return { ok: false, error: "Not available." };
  const admin = getSupabaseAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY isn't set in .env.local." };

  const created = await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
    user_metadata: { name: "Dev Owner" },
  });
  if (created.error) {
    // Already exists: reset its password so the known one always works.
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) return { ok: false, error: error.message };
    const user = data.users.find((u) => u.email?.toLowerCase() === DEV_EMAIL);
    if (!user) return { ok: false, error: created.error.message };
    const upd = await admin.auth.admin.updateUserById(user.id, { password: DEV_PASSWORD, email_confirm: true });
    if (upd.error) return { ok: false, error: upd.error.message };
  }
  return { ok: true, email: DEV_EMAIL, password: DEV_PASSWORD };
}
