import { isAdmin } from "@/lib/admin-auth";
import { getUsersForAdminDashboard } from "@/lib/queries/users";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

import CustomersPageClient from "./page.client";

export default async function CustomersPage() {
  const [data, adminUser] = await Promise.all([
    getUsersForAdminDashboard(),
    isAdmin(),
  ]);

  return (
    <CustomersPageClient
      initialData={data}
      adminUser={adminUser}
      authSyncEnabled={isSupabaseAdminConfigured()}
    />
  );
}
