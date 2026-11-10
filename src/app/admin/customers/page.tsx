import { requirePagePermission } from "@/lib/admin-auth";
import { getUsersForAdminDashboard } from "@/lib/queries/users";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

import CustomersPageClient from "./page.client";

export default async function CustomersPage() {
  const adminUser = await requirePagePermission("canManageCustomers", "/admin/customers");
  const data = await getUsersForAdminDashboard();

  return (
    <CustomersPageClient
      initialData={data}
      adminUser={adminUser}
      authSyncEnabled={isSupabaseAdminConfigured()}
    />
  );
}
