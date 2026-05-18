import "server-only";

import type { UserWithRole } from "@/app/admin/customers/page.types";
import { getUsersForAdminDashboard } from "@/lib/queries/users";

/** @deprecated Use getUsersForAdminDashboard — syncs with Supabase Auth first */
export async function getUsersWithRoles(): Promise<UserWithRole[]> {
  return getUsersForAdminDashboard();
}
