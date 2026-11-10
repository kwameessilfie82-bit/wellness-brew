
import { requirePagePermission } from "@/lib/admin-auth";
import { CategoryManagement } from "@/ui/components/admin/category-management";

export default async function CategoriesPage() {
  const adminUser = await requirePagePermission("canManageCategories", "/admin/categories");

  return <CategoryManagement adminUser={adminUser} />;
}
