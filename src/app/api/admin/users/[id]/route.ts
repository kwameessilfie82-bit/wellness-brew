import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-middleware";
import { deleteUserCompletely } from "@/lib/queries/delete-user";

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

      const result = await deleteUserCompletely(userId);

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      return NextResponse.json({
        message: "User and all related data deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete user";
      return NextResponse.json({ error: message }, { status: 500 });
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
