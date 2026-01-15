import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    const adminUser = await isAdmin();
    
    if (!adminUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: adminUser.id,
      email: adminUser.user?.email || "",
      name: adminUser.user?.name || "",
      role: adminUser.role ? {
        id: adminUser.role.id,
        name: adminUser.role.name,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching admin user:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin user" },
      { status: 500 }
    );
  }
}
