import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { adminUserTable, adminRoleTable, userTable } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  role: z.enum(["none", "manager", "admin", "customer"]),
});

// PUT /api/admin/users/[id]/role - Update user role
const putHandler = withAdminAuth(
  async (request: NextRequest, adminUser, context?: { params: Record<string, string> }) => {
    try {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = bodySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid role", issues: z.flattenError(parsed.error) },
          { status: 400 }
        );
      }

      const params = context?.params as { id: string };
      const { role } = parsed.data;
      const userId = params.id;

      if (adminUser.userId === userId) {
        return NextResponse.json(
          { error: "You cannot change your own role" },
          { status: 400 }
        );
      }

      const targetUser = await db.query.userTable.findFirst({
        where: eq(userTable.id, userId),
        columns: { id: true },
      });

      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Never demote/remove the last active manager
      if (role !== "manager") {
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
              { error: "Cannot demote or remove the last active manager" },
              { status: 409 }
            );
          }
        }
      }

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
          id: `admin-${crypto.randomUUID()}`,
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
  "canManageAdmins"
);

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return putHandler(request, { params: { id } });
}
