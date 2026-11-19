import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { adminUserTable, adminRoleTable, userTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isLastActiveManager, withManagerLock } from "@/lib/admin-manager-guard";
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

      // Check + mutation run under one lock so two concurrent demotions
      // can't both pass the "last manager" check.
      const outcome = await withManagerLock(async (tx) => {
        if (role !== "manager" && (await isLastActiveManager(tx, userId))) {
          return { kind: "last-manager" } as const;
        }

        if (role === "none") {
          await tx.delete(adminUserTable).where(eq(adminUserTable.userId, userId));
          return { kind: "removed" } as const;
        }

        const roleRecord = await tx.query.adminRoleTable.findFirst({
          where: eq(adminRoleTable.name, role),
        });
        if (!roleRecord) return { kind: "no-role" } as const;

        const now = new Date();
        const existingAdminUser = await tx.query.adminUserTable.findFirst({
          where: eq(adminUserTable.userId, userId),
          columns: { id: true },
        });
        if (existingAdminUser) {
          await tx
            .update(adminUserTable)
            .set({ roleId: roleRecord.id, updatedAt: now })
            .where(eq(adminUserTable.userId, userId));
        } else {
          await tx.insert(adminUserTable).values({
            id: `admin-${crypto.randomUUID()}`,
            userId,
            roleId: roleRecord.id,
            isActive: true,
            // createdBy references the base user id, not the admin_user id.
            createdBy: adminUser.user?.id ?? null,
            createdAt: now,
            updatedAt: now,
          });
        }
        return { kind: "updated", roleRecord } as const;
      });

      if (outcome.kind === "last-manager") {
        return NextResponse.json(
          { error: "Cannot demote or remove the last active manager" },
          { status: 409 },
        );
      }
      if (outcome.kind === "no-role") {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }
      if (outcome.kind === "removed") {
        return NextResponse.json({ message: "User role removed successfully", role: null });
      }

      return NextResponse.json({
        message: "User role updated successfully",
        role: {
          name: outcome.roleRecord.name,
          description: outcome.roleRecord.description || "",
        },
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
