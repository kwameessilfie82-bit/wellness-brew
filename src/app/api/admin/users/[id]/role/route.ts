import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { adminUserTable, adminRoleTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/admin/users/[id]/role - Update user role
const putHandler = withAdminAuth(
  async (request: NextRequest, adminUser, context?: { params: Record<string, string> }) => {
    try {
      const body = await request.json();
      const params = context?.params as { id: string };
      const { role } = body;

      if (!role) {
        return NextResponse.json(
          { error: "Role is required" },
          { status: 400 }
        );
      }

      const userId = params.id;

      // If role is 'none', remove admin privileges
      if (role === 'none') {
        await db.delete(adminUserTable)
          .where(eq(adminUserTable.userId, userId));
        
        return NextResponse.json({ 
          message: "User role removed successfully",
          role: null 
        });
      }

      // Find the role ID
      const roleRecord = await db.query.adminRoleTable.findFirst({
        where: eq(adminRoleTable.name, role),
      });

      if (!roleRecord) {
        return NextResponse.json(
          { error: "Role not found" },
          { status: 404 }
        );
      }

      // Check if user already has an admin role
      const existingAdminUser = await db.query.adminUserTable.findFirst({
        where: eq(adminUserTable.userId, userId),
      });

      if (existingAdminUser) {
        // Update existing admin role
        await db.update(adminUserTable)
          .set({
            roleId: roleRecord.id,
            updatedAt: new Date(),
          })
          .where(eq(adminUserTable.userId, userId));
      } else {
        // Create new admin user record
        await db.insert(adminUserTable).values({
          id: `admin-${Date.now()}`,
          userId: userId,
          roleId: roleRecord.id,
          isActive: true,
          // createdBy should reference the base user id, not the admin_user id
          // Previous line kept for reference:
          // createdBy: adminUser.id,
          createdBy: adminUser.user?.id ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return NextResponse.json({ 
        message: "User role updated successfully",
        role: {
          name: roleRecord.name,
          description: roleRecord.description || '',
        }
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      return NextResponse.json(
        { error: "Failed to update user role" },
        { status: 500 }
      );
    }
  },
  "canManageCustomers"
);

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return putHandler(request, { params: { id } });
}
