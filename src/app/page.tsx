

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAdminUser } from "@/lib/admin-auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    // No user - redirect to sign-up for new users
    redirect("/auth/sign-up");
  }
  
  const adminUser = await getAdminUser(user.id);
  if (adminUser) {
    if (adminUser.role?.name === "manager") {
      redirect("/admin");
    }
    // Admin (non-manager) → Inventory
    redirect("/admin/inventory");
  }
  
  // Regular users (customers) - pending until manager updates role
  redirect("/auth/pending");

  // Previous landing content preserved for reference:
  // return (
  //   <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
  //     <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
  //       <h1>Danebes Inventory Management</h1>
  //     </main>
  //   </div>
  // );
}
