import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { CategoryManagement } from "@/ui/components/admin/category-management";

export default async function CategoriesPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/categories");
  }

  if (!adminUser.role.permissions.canManageCategories) {
    redirect("/admin");
  }

  return <CategoryManagement adminUser={adminUser} />;
}
