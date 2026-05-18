import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/ui/components/admin/admin-sidebar";
import { AdminTopBar } from "@/ui/components/admin/admin-top-bar";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar adminUser={adminUser} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar adminUser={adminUser} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
