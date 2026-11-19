import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { adminUserTable } from "@/db/schema";
import { isLastActiveManager, withManagerLock } from "@/lib/admin-manager-guard";
import { withAdminAuth } from "@/lib/admin-middleware";
import { deleteUserCompletely } from "@/lib/queries/users";

const deleteHandler = withAdminAuth(
  async (_request: NextRequest, adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const userId = params.id;

      if (adminUser.userId === userId) {
        return NextResponse.json(
          { error: "You cannot delete your own account" },
          { status: 400 },
        );
      }

      // Under the manager lock: refuse if this is the last manager, otherwise
      // revoke admin access first. Auth deletion below calls Supabase (outside
      // the DB transaction); if it fails, the user is merely left without admin rights.
      const blocked = await withManagerLock(async (tx) => {
        if (await isLastActiveManager(tx, userId)) return true;
        await tx.delete(adminUserTable).where(eq(adminUserTable.userId, userId));
        return false;
      });
      if (blocked) {
        return NextResponse.json(
          { error: "Cannot delete the last active manager" },
          { status: 409 },
        );
      }

      const result = await deleteUserCompletely(userId);

      if (!result.ok) {
        console.error("Error deleting user:", result.error);
        return NextResponse.json(
          {
            error:
              result.status === 404 ? "User not found" : "Failed to delete user",
          },
          { status: result.status },
        );
      }

      return NextResponse.json({
        message: "User and all related data deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
  },
  "canManageCustomers",
);

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return deleteHandler(request, { params: { id } });
}
