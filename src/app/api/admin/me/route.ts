import { NextResponse } from "next/server";

import { getAdminUser, makeUserAdmin } from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/owner-emails";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated", isAdmin: false },
        { status: 401 },
      );
    }

    let adminUser = await getAdminUser(user.id);

    if (!adminUser && isOwnerEmail(user.email)) {
      await makeUserAdmin(user.id, "manager");
      adminUser = await getAdminUser(user.id);
    }

    if (!adminUser) {
      return NextResponse.json({
        email: user.email,
        isAdmin: false,
        name: user.name,
      });
    }

    return NextResponse.json({
      adminUser,
      email: adminUser.user?.email || user.email,
      id: adminUser.id,
      isAdmin: true,
      name: adminUser.user?.name || user.name,
      role: adminUser.role
        ? {
            id: adminUser.role.id,
            name: adminUser.role.name,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin user" },
      { status: 500 },
    );
  }
}
