import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { EnhancedInventoryManagement } from "@/ui/components/admin/enhanced-inventory-management";

export default async function InventoryPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/inventory");
  }

  // Allow managers and admins explicitly; block others
  const roleName = adminUser.role?.name;
  if (roleName !== "manager" && roleName !== "admin") {
    redirect("/auth/not-authorized");
  }

  return <EnhancedInventoryManagement adminUser={adminUser} />;
}
