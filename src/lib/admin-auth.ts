/**
 * Admin authentication and authorization utilities
 */

import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import {
  adminUserTable,
  adminRoleTable,
  type AdminUserWithDetails,
  type AdminPermissions,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Default admin permissions
// Roles: manager (full access), admin (limited - no users or dashboards), customer (no admin access)
export const ADMIN_PERMISSIONS: Record<string, AdminPermissions> = {
  manager: {
    canManageProducts: true,
    canManageCategories: true,
    canManageInventory: true,
    canManageAdmins: true,
    canViewAnalytics: true,
    canManageOrders: true,
    canManageCustomers: true,
    canManageSettings: true,
  },
  admin: {
    canManageProducts: true,
    canManageCategories: true,
    canManageInventory: true,
    canManageAdmins: false, // no access to Users management
    canViewAnalytics: false, // no access to dashboards/analytics
    canManageOrders: true,
    canManageCustomers: false, // no access to Users (customers) management
    canManageSettings: false,
  },
  customer: {
    canManageProducts: false,
    canManageCategories: false,
    canManageInventory: false,
    canManageAdmins: false,
    canViewAnalytics: false,
    canManageOrders: false,
    canManageCustomers: false,
    canManageSettings: false,
  },
};

/**
 * Get admin user details with role and permissions
 */
export async function getAdminUser(userId: string): Promise<AdminUserWithDetails | null> {
  try {
    const adminUser = await db.query.adminUserTable.findFirst({
      where: and(
        eq(adminUserTable.userId, userId),
        eq(adminUserTable.isActive, true)
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        role: true,
        createdBy: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            role: true,
          },
        },
      },
    });

    if (!adminUser) {
      return null;
    }

    // Parse permissions for current role
    const permissions = JSON.parse(adminUser.role.permissions) as AdminPermissions;

    // Normalize createdBy relation to match AdminUserWithDetails shape
    let createdByNormalized: AdminUserWithDetails | null = null;
    if (adminUser.createdBy) {
      const cb = adminUser.createdBy as unknown as AdminUserWithDetails;
      createdByNormalized = {
        id: cb.id,
        userId: cb.userId,
        roleId: cb.roleId,
        isActive: cb.isActive,
        createdBy: null,
        createdAt: cb.createdAt,
        updatedAt: cb.updatedAt,
        user: cb.user,
        role: {
          ...cb.role,
          permissions: JSON.parse((cb.role as unknown as { permissions: string }).permissions) as AdminPermissions,
        },
      };
    }

    return {
      ...adminUser,
      role: {
        ...adminUser.role,
        permissions,
      },
      createdBy: createdByNormalized,
    } as AdminUserWithDetails;
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return null;
  }
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<AdminUserWithDetails | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return getAdminUser(user.id);
}

/**
 * Check if admin has specific permission
 */
export function hasPermission(
  adminUser: AdminUserWithDetails | null,
  permission: keyof AdminPermissions
): boolean {
  if (!adminUser || !adminUser.isActive) {
    return false;
  }

  return adminUser.role.permissions[permission] === true;
}

/**
 * Check if admin has any of the specified permissions
 */
export function hasAnyPermission(
  adminUser: AdminUserWithDetails | null,
  permissions: (keyof AdminPermissions)[]
): boolean {
  if (!adminUser || !adminUser.isActive) {
    return false;
  }

  return permissions.some(permission => adminUser.role.permissions[permission] === true);
}

/**
 * Check if admin has all of the specified permissions
 */
export function hasAllPermissions(
  adminUser: AdminUserWithDetails | null,
  permissions: (keyof AdminPermissions)[]
): boolean {
  if (!adminUser || !adminUser.isActive) {
    return false;
  }

  return permissions.every(permission => adminUser.role.permissions[permission] === true);
}

/**
 * Get admin role by name
 */
export async function getAdminRole(roleName: string) {
  try {
    return await db.query.adminRoleTable.findFirst({
      where: eq(adminRoleTable.name, roleName),
    });
  } catch (error) {
    console.error("Error fetching admin role:", error);
    return null;
  }
}

/**
 * Create default admin roles if they don't exist
 */
export async function createDefaultAdminRoles() {
  try {
    const existingRoles = await db.query.adminRoleTable.findMany();
    
    if (existingRoles.length === 0) {
      const roles = [
        {
          id: "manager",
          name: "manager",
          description: "Manager with full access",
          permissions: JSON.stringify(ADMIN_PERMISSIONS.manager),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "admin",
          name: "admin",
          description: "Admin with access to most resources except Users and dashboards",
          permissions: JSON.stringify(ADMIN_PERMISSIONS.admin),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "customer",
          name: "customer",
          description: "Customer role with no admin access",
          permissions: JSON.stringify(ADMIN_PERMISSIONS.customer),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.insert(adminRoleTable).values(roles);
      // console.log("Default admin roles created successfully");
    }
  } catch (error) {
    console.error("Error creating default admin roles:", error);
  }
}

/**
 * Make a user an admin
 */
export async function makeUserAdmin(
  userId: string,
  roleName: string = "admin",
  createdBy?: string
) {
  try {
    const role = await getAdminRole(roleName);
    if (!role) {
      throw new Error(`Role ${roleName} not found`);
    }

    // Check if user is already an admin
    const existingAdmin = await db.query.adminUserTable.findFirst({
      where: eq(adminUserTable.userId, userId),
    });

    if (existingAdmin) {
      // Update existing admin
      await db.update(adminUserTable)
        .set({
          roleId: role.id,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(adminUserTable.userId, userId));
    } else {
      // Create new admin
      await db.insert(adminUserTable).values({
        id: `admin_${userId}`,
        userId,
        roleId: role.id,
        isActive: true,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return true;
  } catch (error) {
    console.error("Error making user admin:", error);
    return false;
  }
}

/**
 * Remove admin privileges from a user
 */
export async function removeAdminPrivileges(userId: string) {
  try {
    await db.update(adminUserTable)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(adminUserTable.userId, userId));

    return true;
  } catch (error) {
    console.error("Error removing admin privileges:", error);
    return false;
  }
}
