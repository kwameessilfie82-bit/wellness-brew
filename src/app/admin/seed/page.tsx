import { requirePagePermission } from "@/lib/admin-auth"
import { SeedPageClient } from "./seed-client"

export default async function SeedPage() {
  // Seeding is manager-only
  await requirePagePermission("canManageAdmins", "/admin/seed")

  return <SeedPageClient />
}
