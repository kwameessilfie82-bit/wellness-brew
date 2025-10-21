import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { OrderManagement } from "@/ui/components/admin/order-management";

export default async function OrdersPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/orders");
  }

  if (!adminUser.role.permissions.canManageOrders) {
    redirect("/admin");
  }

  return <OrderManagement adminUser={adminUser} />;
}
