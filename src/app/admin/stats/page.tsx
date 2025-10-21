import { redirect } from "next/navigation";

export default function AdminStatsPage() {
  // Redirect to dashboard since stats are now integrated there
  redirect("/admin");
}
