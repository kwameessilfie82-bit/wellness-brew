/**
 * Admin middleware for route protection
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin, hasPermission, hasAnyPermission, hasAllPermissions } from "./admin-auth";
import type { AdminPermissions, AdminUserWithDetails } from "@/db/schema";

/**
 * Middleware to check if user is an admin
 */
export async function requireAdmin() {
  const adminUser = await isAdmin();
  
  if (!adminUser) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  return adminUser;
}

/**
 * Middleware to check if admin has specific permission
 */
export function requirePermission(permission: keyof AdminPermissions) {
  return async () => {
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!hasPermission(adminUser, permission)) {
      return NextResponse.json(
        { error: `Permission '${permission}' required` },
        { status: 403 }
      );
    }

    return adminUser;
  };
}

/**
 * Middleware to check if admin has any of the specified permissions
 */
export function requireAnyPermission(permissions: (keyof AdminPermissions)[]) {
  return async () => {
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!hasAnyPermission(adminUser, permissions)) {
      return NextResponse.json(
        { error: `One of these permissions required: ${permissions.join(", ")}` },
        { status: 403 }
      );
    }

    return adminUser;
  };
}

/**
 * Middleware to check if admin has all of the specified permissions
 */
export function requireAllPermissions(permissions: (keyof AdminPermissions)[]) {
  return async () => {
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!hasAllPermissions(adminUser, permissions)) {
      return NextResponse.json(
        { error: `All of these permissions required: ${permissions.join(", ")}` },
        { status: 403 }
      );
    }

    return adminUser;
  };
}

/**
 * Higher-order function to wrap API routes with admin middleware
 */
export function withAdminAuth(
  handler: (request: NextRequest, adminUser: AdminUserWithDetails, context?: { params: Record<string, string> }) => Promise<NextResponse>,
  permissionCheck?: (keyof AdminPermissions)[] | keyof AdminPermissions
) {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    try {
      let adminUser: AdminUserWithDetails | null;

      if (Array.isArray(permissionCheck)) {
        // Check for any of the permissions
        const middleware = requireAnyPermission(permissionCheck);
        const result = await middleware();
        
        if (result instanceof NextResponse) {
          return result; // Error response
        }
        
        adminUser = result;
      } else if (permissionCheck) {
        // Check for specific permission
        const middleware = requirePermission(permissionCheck);
        const result = await middleware();
        
        if (result instanceof NextResponse) {
          return result; // Error response
        }
        
        adminUser = result;
      } else {
        // Just check if user is admin
        const result = await requireAdmin();
        
        if (result instanceof NextResponse) {
          return result; // Error response
        }
        
        adminUser = result;
      }

      return await handler(request, adminUser as AdminUserWithDetails, context);
    } catch (error) {
      console.error("Admin middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Client-side hook to check admin status
 */
export function useAdminAuth() {
  // This would be used in client components
  // For now, we'll return a placeholder
  return {
    isAdmin: false,
    adminUser: null,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
  };
}
