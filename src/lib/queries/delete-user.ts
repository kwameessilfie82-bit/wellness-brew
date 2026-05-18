import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  adminUserTable,
  orderItemTable,
  storeOrderTable,
  userTable,
  verificationTable,
} from "@/db/schema";
import { deleteSupabaseAuthUser } from "@/lib/supabase/admin";

/**
 * Removes a user from Supabase Auth and the app database, including related data.
 */
export async function deleteUserCompletely(userId: string) {
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
  });

  if (!user) {
    return { ok: false as const, error: "User not found", status: 404 };
  }

  const authResult = await deleteSupabaseAuthUser(userId);

  if (!authResult.success) {
    return {
      ok: false as const,
      error:
        authResult.error ??
        "Could not delete user from Supabase Auth. Check SUPABASE_SERVICE_ROLE_KEY.",
      status: 500,
    };
  }

  await db.transaction(async (tx) => {
    const orders = await tx.query.storeOrderTable.findMany({
      where: eq(storeOrderTable.userId, userId),
      columns: { id: true },
    });

    for (const order of orders) {
      await tx
        .delete(orderItemTable)
        .where(eq(orderItemTable.orderId, order.id));
    }

    await tx.delete(storeOrderTable).where(eq(storeOrderTable.userId, userId));

    await tx.delete(adminUserTable).where(eq(adminUserTable.userId, userId));

    await tx
      .delete(verificationTable)
      .where(eq(verificationTable.identifier, user.email));

    await tx.delete(userTable).where(eq(userTable.id, userId));
  });

  return { ok: true as const };
}
