import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { desc, eq } from "drizzle-orm";

import type { UserWithRole } from "@/app/admin/customers/page.types";
import { syncUserFromSupabase } from "@/lib/auth";
import { db } from "@/db";
import { userTable } from "@/db/schema";
import {
  deleteAppUserDataOnly,
  deleteUserCompletely,
} from "@/lib/queries/delete-user";
import {
  isSupabaseAdminConfigured,
  listAllSupabaseAuthUsers,
} from "@/lib/supabase/admin";

export { deleteUserCompletely };

/**
 * The `user` table stores profile + order links. Supabase Auth is the source of truth
 * for who exists. IDs must match Supabase auth user ids.
 */
export async function syncUsersWithAuth(): Promise<{
  synced: number;
  pruned: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { synced: 0, pruned: 0 };
  }

  const authResult = await listAllSupabaseAuthUsers();
  if (!authResult.ok) {
    throw new Error(authResult.error);
  }

  const authIds = new Set<string>();

  for (const authUser of authResult.users) {
    if (!authUser.email) {
      continue;
    }
    authIds.add(authUser.id);
    await syncUserFromSupabase(authUser as SupabaseAuthUser);
  }

  let pruned = 0;
  const dbUsers = await db.query.userTable.findMany({
    columns: { id: true },
  });

  for (const row of dbUsers) {
    if (!authIds.has(row.id)) {
      await deleteAppUserDataOnly(row.id);
      pruned += 1;
    }
  }

  return { synced: authIds.size, pruned };
}

async function getUsersWithRolesFromDb(): Promise<UserWithRole[]> {
  const users = await db.query.userTable.findMany({
    orderBy: [desc(userTable.createdAt)],
    with: {
      adminUser: {
        with: {
          role: true,
        },
      },
    },
  });

  return users.map((user) => ({
    ...user,
    adminRole:
      (
        user as typeof user & {
          adminUser?: { role: { name: string; description: string | null } }[];
        }
      ).adminUser?.[0]?.role
        ? {
            name: (
              user as typeof user & {
                adminUser?: { role: { name: string; description: string | null } }[];
              }
            ).adminUser![0].role.name,
            description:
              (
                user as typeof user & {
                  adminUser?: { role: { name: string; description: string | null } }[];
                }
              ).adminUser![0].role.description || "",
          }
        : null,
  }));
}

/** Load users for the manager dashboard — synced with Supabase Auth first. */
export async function getUsersForAdminDashboard(): Promise<UserWithRole[]> {
  if (isSupabaseAdminConfigured()) {
    await syncUsersWithAuth();
  }

  return getUsersWithRolesFromDb();
}
