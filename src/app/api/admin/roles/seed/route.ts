import { NextResponse, NextRequest } from "next/server";
import { db } from "@/db";
import { adminRoleTable } from "@/db/schema";
import { withAdminAuth } from "@/lib/admin-middleware";
import { ADMIN_PERMISSIONS } from "@/lib/admin-auth";
import { eq } from "drizzle-orm";

type RoleSeed = {
  id: string;
  name: string;
  description: string;
  permissions: string;
};

async function seedRoles(adminUserId?: string) {
  const now = new Date();

  const desiredRoles: RoleSeed[] = [
    {
      id: "manager",
      name: "manager",
      description: "Manager with full access",
      permissions: JSON.stringify(ADMIN_PERMISSIONS.manager),
    },
    {
      id: "admin",
      name: "admin",
      description: "Admin with access to most resources except Users and dashboards",
      permissions: JSON.stringify(ADMIN_PERMISSIONS.admin),
    },
    {
      id: "customer",
      name: "customer",
      description: "Customer role with no admin access",
      permissions: JSON.stringify(ADMIN_PERMISSIONS.customer),
    },
  ];

  const existing = await db.query.adminRoleTable.findMany();
  const existingById = new Map(existing.map(r => [r.id, r]));

  const toInsert = desiredRoles
    .filter(r => !existingById.has(r.id))
    .map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions,
      createdAt: now,
      updatedAt: now,
    }));

  // Update permissions/description for roles that exist but drifted
  const toUpdate = desiredRoles
    .filter(r => existingById.has(r.id))
    .filter(r => {
      const cur = existingById.get(r.id)!;
      return cur.permissions !== r.permissions || cur.description !== r.description || cur.name !== r.name;
    });

  if (toInsert.length > 0) {
    await db.insert(adminRoleTable).values(toInsert);
  }

  for (const r of toUpdate) {
    await db
      .update(adminRoleTable)
      .set({
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        updatedAt: now,
      })
      .where(eq(adminRoleTable.id, r.id));
  }

  const totalAfter = (await db.query.adminRoleTable.findMany()).length;

  return {
    inserted: toInsert.length,
    updated: toUpdate.length,
    totalAfter,
    by: adminUserId ?? null,
  };
}

const handler = withAdminAuth(async (_request, adminUser) => {
  try {
    const result = await seedRoles(adminUser.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error seeding roles:", error);
    return NextResponse.json({ error: "Failed to seed roles" }, { status: 500 });
  }
}, "canManageAdmins");

export async function POST(_request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  // Allow unauthenticated bootstrap only if no roles exist yet
  const existing = await db.query.adminRoleTable.findMany();
  if (existing.length === 0) {
    try {
      const result = await seedRoles();
      return NextResponse.json({ ...result, seededWithoutAuth: true });
    } catch (error) {
      console.error("Error bootstrapping roles:", error);
      return NextResponse.json({ error: "Failed to seed roles" }, { status: 500 });
    }
  }
  return handler(_request);
}


