import { redirect } from "next/navigation"
import { isAdmin } from "@/lib/admin-auth"
import { SeedPageClient } from "./seed-client"

export default async function SeedPage() {
  const adminUser = await isAdmin()

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/seed")
  }

  // Allow managers and admins explicitly
  const roleName = adminUser.role?.name
  if (roleName !== "manager" && roleName !== "admin") {
    redirect("/auth/not-authorized")
  }

  return <SeedPageClient />
}
