import "server-only";
import { desc } from "drizzle-orm";

import type { UserWithRole } from "@/app/admin/customers/page.types";

import { db } from "@/db";
import { userTable } from "@/db/schema";

// Fetch users and their admin roles using relational queries
export async function getUsersWithRoles(): Promise<UserWithRole[]> {
  try {
    const users = await db.query.userTable.findMany({
      orderBy: [desc(userTable.createdAt)],
      with: {
        adminUser: {
          with: {
            role: true,
          },
        },
      },
    });

    // Transform the data to match our expected structure
    return users.map((user) => ({
      ...user,
      adminRole:
        (user as typeof user & { adminUser?: { role: { name: string; description: string | null } }[] }).adminUser?.[0]
          ?.role
          ? {
              name:
                (user as typeof user & { adminUser?: { role: { name: string; description: string | null } }[] })
                  .adminUser![0].role.name,
              description:
                (user as typeof user & { adminUser?: { role: { name: string; description: string | null } }[] })
                  .adminUser![0].role.description || "",
            }
          : null,
    }));
  } catch (error) {
    console.error("Failed to fetch users with roles:", error);
    return [];
  }
}
