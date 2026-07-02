import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { EnhancedInventoryManagement } from "@/ui/components/admin/enhanced-inventory-management";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";
import { InventoryStatsBar } from "@/ui/components/admin/inventory-stats-bar";
import { fetchCategoriesForInventory } from "@/lib/queries/categories";
import { fetchInventoryList, fetchInventoryStats } from "@/lib/queries/inventory";
import type { Category, Inventory, Product } from "@/db/schema";

// Always render fresh so admins never see a stale catalog.
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/inventory");
  }

  const roleName = adminUser.role?.name;
  if (roleName !== "manager" && roleName !== "admin") {
    redirect("/auth/not-authorized");
  }

  // Fetch the first screen of data on the server so products render on first
  // paint instead of after a client-side mount → fetch waterfall.
  const [{ products }, stats, categories] = await Promise.all([
    fetchInventoryList({ page: 1, limit: 200 }),
    fetchInventoryStats(),
    fetchCategoriesForInventory(),
  ]);

  const initialInventory = products
    .map((product) => product.inventory)
    .filter((inv): inv is NonNullable<typeof inv> => Boolean(inv));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Product catalog & inventory"
        description="Full control over what customers see — products, stock, pricing, and availability."
      />
      <InventoryStatsBar initialStats={stats} />
      <div className="admin-panel">
        {/* The list/query shapes are structural subsets of the Drizzle models;
            the client component reads them loosely (as it does the API JSON). */}
        <EnhancedInventoryManagement
          adminUser={adminUser}
          initialProducts={products as unknown as Product[]}
          initialInventory={initialInventory as unknown as Inventory[]}
          initialCategories={categories as unknown as Category[]}
        />
      </div>
    </div>
  );
}
