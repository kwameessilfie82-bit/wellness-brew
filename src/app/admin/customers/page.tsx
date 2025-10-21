import { getUsersWithRoles } from "@/lib/queries/uploads";
import { isAdmin } from "@/lib/admin-auth";

import CustomersPageClient from "./page.client";

export default async function CustomersPage() {
  const [data, adminUser] = await Promise.all([
    getUsersWithRoles(),
    isAdmin(),
  ]);

  return <CustomersPageClient initialData={data} adminUser={adminUser} />;
}
