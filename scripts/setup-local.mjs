/**
 * One-shot local DB setup:
 *   1. Push the full Drizzle schema to the local Postgres (drizzle-kit push).
 *   2. Seed the three admin roles (manager / admin / customer) so the
 *      /api/admin/roles/bootstrap route can promote the first signed-in user.
 *
 * Usage: npm run db:setup   (requires the Supabase stack running: npm run db:start)
 */
import { config } from "dotenv";
import { execa } from "execa";
import postgres from "postgres";

// Local overrides first, then .env.
config({ path: [".env.local", ".env"] });

const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Create .env.local (see .env.example).");
  process.exit(1);
}

// Keep these in sync with ADMIN_PERMISSIONS in src/lib/admin-auth.ts
const ROLES = [
  {
    id: "manager",
    name: "manager",
    description: "Manager with full access",
    permissions: {
      canManageProducts: true,
      canManageCategories: true,
      canManageInventory: true,
      canManageAdmins: true,
      canViewAnalytics: true,
      canManageOrders: true,
      canManageCustomers: true,
      canManageSettings: true,
    },
  },
  {
    id: "admin",
    name: "admin",
    description: "Admin with access to most resources except Users and dashboards",
    permissions: {
      canManageProducts: true,
      canManageCategories: true,
      canManageInventory: true,
      canManageAdmins: false,
      canViewAnalytics: false,
      canManageOrders: true,
      canManageCustomers: false,
      canManageSettings: false,
    },
  },
  {
    id: "customer",
    name: "customer",
    description: "Customer role with no admin access",
    permissions: {
      canManageProducts: false,
      canManageCategories: false,
      canManageInventory: false,
      canManageAdmins: false,
      canViewAnalytics: false,
      canManageOrders: false,
      canManageCustomers: false,
      canManageSettings: false,
    },
  },
];

console.log("→ Pushing Drizzle schema to local Postgres...");
await execa("npx", ["--no-install", "drizzle-kit", "push", "--force"], {
  stdio: "inherit",
  shell: true,
});

console.log("\n→ Seeding admin roles...");
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 30 });
try {
  const now = new Date();
  for (const role of ROLES) {
    await sql`
      INSERT INTO admin_role (id, name, description, permissions, created_at, updated_at)
      VALUES (${role.id}, ${role.name}, ${role.description}, ${JSON.stringify(
        role.permissions,
      )}, ${now}, ${now})
      ON CONFLICT (name) DO NOTHING
    `;
    console.log("  OK:", role.name);
  }
  console.log("\nDone. Sign up with an OWNER_EMAILS email, then POST /api/admin/roles/bootstrap.");
} finally {
  await sql.end({ timeout: 5 });
}
