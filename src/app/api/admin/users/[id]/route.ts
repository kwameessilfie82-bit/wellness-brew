import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { adminRoleTable, adminUserTable } from "@/db/schema";
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

      // Never delete the last active manager
      const [target] = await db
        .select({ roleName: adminRoleTable.name, isActive: adminUserTable.isActive })
        .from(adminUserTable)
        .innerJoin(adminRoleTable, eq(adminUserTable.roleId, adminRoleTable.id))
        .where(eq(adminUserTable.userId, userId));

      if (target?.roleName === "manager" && target.isActive) {
        const [{ value: activeManagers }] = await db
          .select({ value: count() })
          .from(adminUserTable)
          .innerJoin(adminRoleTable, eq(adminUserTable.roleId, adminRoleTable.id))
          .where(and(eq(adminRoleTable.name, "manager"), eq(adminUserTable.isActive, true)));

        if (activeManagers <= 1) {
          return NextResponse.json(
            { error: "Cannot delete the last active manager" },
            { status: 409 },
          );
        }
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
