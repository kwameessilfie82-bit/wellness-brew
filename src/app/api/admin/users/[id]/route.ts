import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { userTable } from "@/db/schema";
import { eq } from "drizzle-orm";


// DELETE /api/admin/users/[id] - Delete user
const deleteHandler = withAdminAuth(
  async (_request: NextRequest, adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const userId = params.id;

      // Prevent self-deletion
      if (adminUser.userId === userId) {
        return NextResponse.json(
          { error: "You cannot delete your own account" },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // Delete the user (this should cascade delete related records, including admin role if any)
      await db.delete(userTable)
        .where(eq(userTable.id, userId));

      return NextResponse.json({ 
        message: "User deleted successfully" 
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }
  },
  "canManageCustomers"
);

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return deleteHandler(request, { params: { id } });
}
