import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminRoleTable, adminUserTable } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

// POST /api/admin/roles/bootstrap
// Promotes the current authenticated user to Manager IF there are no admin users yet.
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const existingAdmins = await db.query.adminUserTable.findMany();
    if (existingAdmins.length > 0) {
      return NextResponse.json({ error: "Bootstrap not allowed; admins already exist" }, { status: 403 });
    }

    const managerRole = await db.query.adminRoleTable.findFirst({ where: eq(adminRoleTable.name, "manager") });
    if (!managerRole) {
      return NextResponse.json({ error: "Manager role not found. Seed roles first." }, { status: 400 });
    }

    const now = new Date();
    await db.insert(adminUserTable).values({
      id: `admin_${user.id}`,
      userId: user.id,
      roleId: managerRole.id,
      isActive: true,
      createdBy: null,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ message: "Bootstrapped current user as Manager" });
  } catch (error) {
    console.error("Error bootstrapping manager:", error);
    return NextResponse.json({ error: "Failed to bootstrap manager" }, { status: 500 });
  }
}


