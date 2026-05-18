import "server-only";

import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  adminRoleTable,
  adminUserTable,
  type AdminPermissions,
  type AdminUserWithDetails,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

function parsePermissions(raw: string): AdminPermissions {
  return JSON.parse(raw) as AdminPermissions;
}

/**
 * Lightweight admin lookup for API routes (no nested createdBy graph).
 * Deduplicated per request via React cache().
 */
export const getAuthenticatedAdmin = cache(
  async (): Promise<AdminUserWithDetails | null> => {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const row = await db
      .select({
        adminId: adminUserTable.id,
        isActive: adminUserTable.isActive,
        roleId: adminRoleTable.id,
        roleName: adminRoleTable.name,
        permissions: adminRoleTable.permissions,
        userId: adminUserTable.userId,
      })
      .from(adminUserTable)
      .innerJoin(adminRoleTable, eq(adminUserTable.roleId, adminRoleTable.id))
      .where(
        and(
          eq(adminUserTable.userId, user.id),
          eq(adminUserTable.isActive, true),
        ),
      )
      .limit(1);

    const admin = row[0];
    if (!admin) {
      return null;
    }

    const permissions = parsePermissions(admin.permissions);
    const now = new Date();

    return {
      id: admin.adminId,
      userId: admin.userId,
      roleId: admin.roleId,
      isActive: admin.isActive,
      createdBy: null,
      createdAt: now,
      updatedAt: now,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      role: {
        id: admin.roleId,
        name: admin.roleName,
        description: null,
        permissions,
        createdAt: now,
        updatedAt: now,
      },
    };
  },
);

export function adminHasPermission(
  admin: AdminUserWithDetails,
  permission: keyof AdminPermissions,
): boolean {
  return admin.role.permissions[permission] === true;
}
