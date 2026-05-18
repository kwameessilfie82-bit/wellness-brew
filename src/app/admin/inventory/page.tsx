import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { EnhancedInventoryManagement } from "@/ui/components/admin/enhanced-inventory-management";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";
import { InventoryStatsBar } from "@/ui/components/admin/inventory-stats-bar";

export default async function InventoryPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/inventory");
  }

  const roleName = adminUser.role?.name;
  if (roleName !== "manager" && roleName !== "admin") {
    redirect("/auth/not-authorized");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Product catalog & inventory"
        description="Full control over what customers see — products, stock, pricing, and availability."
      />
      <InventoryStatsBar />
      <div className="admin-panel">
        <EnhancedInventoryManagement adminUser={adminUser} />
      </div>
    </div>
  );
}
