import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/ui/components/admin/admin-sidebar";
import { Header } from "@/ui/components/header/header";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const adminUser = await isAdmin();

  if (!adminUser) {
    // If user is not an admin, send them to the pending verification page
    // Previous behavior (redirect to sign-in) retained below for reference
    // redirect("/auth/sign-in?redirect=/admin");
    redirect("/auth/sign-in");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar adminUser={adminUser} />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Main Header */}
        <Header showAuth={true} adminUser={adminUser} />
        
        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}