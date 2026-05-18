import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { OrderManagement } from "@/ui/components/admin/order-management";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

export default async function OrdersPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/orders");
  }

  if (!adminUser.role.permissions.canManageOrders) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Orders"
        description="Track and fulfill customer orders from the storefront checkout."
      />
      <div className="admin-panel">
        <OrderManagement adminUser={adminUser} />
      </div>
    </div>
  );
}
