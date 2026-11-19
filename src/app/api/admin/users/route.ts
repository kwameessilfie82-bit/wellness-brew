import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { adminUserTable } from "@/db/schema";
import { desc } from "drizzle-orm";

const handler = withAdminAuth(async (request: NextRequest) => {
  try {
    const limitParam = Number(request.nextUrl.searchParams.get("limit"));
    const limit =
      Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 100;

    const adminUsers = await db.query.adminUserTable.findMany({
      orderBy: desc(adminUserTable.createdAt),
      limit,
      with: {
        user: true,
        role: true,
        createdBy: {
          with: {
            user: true,
          },
        },
      },
    });

    // Parse permissions JSON for role
    const mapped = adminUsers.map((a) => ({
      ...a,
      role: {
        ...a.role,
        permissions: JSON.parse(a.role.permissions as unknown as string),
      },
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json({ error: "Failed to fetch admin users" }, { status: 500 });
  }
}, "canManageAdmins");

export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return handler(request);
}


