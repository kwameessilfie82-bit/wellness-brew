import { redirect } from "next/navigation";

import { requirePagePermission } from "@/lib/admin-auth";

export default async function AdminStatsPage() {
  await requirePagePermission("canViewAnalytics", "/admin/stats");
  redirect("/admin/analytics");
}
