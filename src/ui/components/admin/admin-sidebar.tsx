"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, FolderOpen, Warehouse, PanelLeft, Users, FileText } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/ui/primitives/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/ui/primitives/sheet";
import type { AdminUserWithDetails } from "@/db/schema";
import { SEO_CONFIG } from "@/app";

interface AdminSidebarProps {
  adminUser: AdminUserWithDetails;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    permission: "canViewAnalytics" as const,
  },
  {
    name: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
    permission: "canManageInventory" as const,
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: FolderOpen,
    permission: "canManageCategories" as const,
  },
  // {
  //   name: "Orders",
  //   href: "/admin/orders",
  //   icon: ShoppingCart,
  //   permission: "canManageOrders" as const,
  // },
  {
    name: "Invoice Generator",
    href: "/admin/invoice-generator",
    icon: FileText,
    permission: "canManageOrders" as const,
  },
  {
    name: "Users",
    href: "/admin/customers",
    icon: Users,
    permission: "canManageCustomers" as const,
  },
];

// Desktop Sidebar Component
function DesktopSidebar({ adminUser, pathname, filteredNavigation }: {
  adminUser: AdminUserWithDetails;
  pathname: string;
  filteredNavigation: typeof navigationItems;
}) {
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-64 min-h-screen bg-background border-r shadow-lg">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 bg-background">
        <h1 className="text-xl font-bold">{SEO_CONFIG.name} Management</h1>
      </div>
      
      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {adminUser.user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {adminUser.user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {adminUser.role?.name?.replace('_', ' ').toUpperCase() || 'ADMIN'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link href="/">
          <Button variant="outline" size="sm" className="w-full">
            Back to Store
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Mobile Sidebar Component
function MobileSidebar({ adminUser, pathname, filteredNavigation }: {
  adminUser: AdminUserWithDetails;
  pathname: string;
  filteredNavigation: typeof navigationItems;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Open admin menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        {/* A11y title for screen readers */}
        <SheetHeader className="sr-only">
          <SheetTitle>Admin menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-4 bg-background">
            <h1 className="text-lg font-bold">Inventory Management</h1>
          </div>
          
          {/* User Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {adminUser.user?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {adminUser.user?.name || 'Admin User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {adminUser.role?.name?.replace('_', ' ').toUpperCase() || 'ADMIN'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className="p-4 border-t border-border">
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(false)}>
                Back to Store
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AdminSidebar({ adminUser }: AdminSidebarProps) {
  const pathname = usePathname();

  // Only render the admin sidebar on admin routes
  if (!pathname?.startsWith("/admin")) {
    return null;
  }

  const hasPermission = (permission: keyof typeof adminUser.role.permissions) => {
    return adminUser.role?.permissions?.[permission] === true;
  };

  const filteredNavigation = navigationItems.filter((item) =>
    hasPermission(item.permission),
  );

  return (
    <>
      <DesktopSidebar 
        adminUser={adminUser} 
        pathname={pathname} 
        filteredNavigation={filteredNavigation} 
      />
      <MobileSidebar 
        adminUser={adminUser} 
        pathname={pathname} 
        filteredNavigation={filteredNavigation} 
      />
    </>
  );
}