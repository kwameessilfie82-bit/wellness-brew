import "server-only";

import { and, count, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { adminRoleTable, adminUserTable } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Runs `fn` in a transaction holding a single app-wide advisory lock, so
 * concurrent role changes / deletions are serialised. Without it, two
 * managers demoting each other at the same instant could both pass the
 * "not the last manager" check and leave the shop with no manager.
 */
export function withManagerLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('admin_user:managers'))`);
    return fn(tx);
  });
}

/** True if `userId` is the only active manager. Call inside withManagerLock. */
export async function isLastActiveManager(tx: Tx, userId: string): Promise<boolean> {
  const [target] = await tx
    .select({ roleName: adminRoleTable.name, isActive: adminUserTable.isActive })
    .from(adminUserTable)
    .innerJoin(adminRoleTable, eq(adminUserTable.roleId, adminRoleTable.id))
    .where(eq(adminUserTable.userId, userId));
  if (target?.roleName !== "manager" || !target.isActive) return false;

  const [{ value }] = await tx
    .select({ value: count() })
    .from(adminUserTable)
    .innerJoin(adminRoleTable, eq(adminUserTable.roleId, adminRoleTable.id))
    .where(and(eq(adminRoleTable.name, "manager"), eq(adminUserTable.isActive, true)));
  return value <= 1;
}
