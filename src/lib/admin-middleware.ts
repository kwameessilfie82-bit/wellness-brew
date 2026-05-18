/**
 * Admin middleware for route protection
 */

import { NextRequest, NextResponse } from "next/server";

import {
  adminHasPermission,
  getAuthenticatedAdmin,
} from "@/lib/admin-session";
import type { AdminPermissions, AdminUserWithDetails } from "@/db/schema";

async function resolveAdmin(
  permissionCheck?: (keyof AdminPermissions)[] | keyof AdminPermissions,
): Promise<AdminUserWithDetails | NextResponse> {
  const adminUser = await getAuthenticatedAdmin();

  if (!adminUser) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  if (Array.isArray(permissionCheck)) {
    const allowed = permissionCheck.some((permission) =>
      adminHasPermission(adminUser, permission),
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error: `One of these permissions required: ${permissionCheck.join(", ")}`,
        },
        { status: 403 },
      );
    }
  } else if (
    permissionCheck &&
    !adminHasPermission(adminUser, permissionCheck)
  ) {
    return NextResponse.json(
      { error: `Permission '${permissionCheck}' required` },
      { status: 403 },
    );
  }

  return adminUser;
}

/**
 * Higher-order function to wrap API routes with admin middleware
 */
export function withAdminAuth(
  handler: (
    request: NextRequest,
    adminUser: AdminUserWithDetails,
    context?: { params: Record<string, string> },
  ) => Promise<NextResponse>,
  permissionCheck?: (keyof AdminPermissions)[] | keyof AdminPermissions,
) {
  return async (
    request: NextRequest,
    context?: { params: Record<string, string> },
  ) => {
    try {
      const result = await resolveAdmin(permissionCheck);

      if (result instanceof NextResponse) {
        return result;
      }

      return await handler(request, result, context);
    } catch (error) {
      console.error("Admin middleware error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
