"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Warehouse,
  PanelLeft,
  Users,
  FileText,
  ShoppingBag,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/ui/primitives/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/primitives/sheet";
import type { AdminUserWithDetails } from "@/db/schema";
import { SEO_CONFIG } from "@/app";

interface AdminSidebarProps {
  adminUser: AdminUserWithDetails;
  mobileOnly?: boolean;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    permission: "canViewAnalytics" as const,
  },
  {
    name: "Catalog",
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
  {
    name: "Orders",
    href: "/admin/orders",
    icon: ShoppingBag,
    permission: "canManageOrders" as const,
  },
  {
    name: "Customers",
    href: "/admin/customers",
    icon: Users,
    permission: "canManageCustomers" as const,
  },
  {
    name: "Invoices",
    href: "/admin/invoice-generator",
    icon: FileText,
    permission: "canManageOrders" as const,
  },
];

function NavLinks({
  pathname,
  items,
  onNavigate,
}: {
  pathname: string;
  items: typeof navigationItems;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 shrink-0",
                isActive ? "text-primary-foreground" : "opacity-70",
              )}
            />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  adminUser,
  pathname,
  filteredNavigation,
  onNavigate,
}: {
  adminUser: AdminUserWithDetails;
  pathname: string;
  filteredNavigation: typeof navigationItems;
  onNavigate?: () => void;
}) {
  return (
  <div className="flex h-full flex-col">
    <div className="border-b border-border/60 px-4 py-5">
      <p className="font-serif text-lg font-bold text-brand">{SEO_CONFIG.name}</p>
      <p className="text-xs text-muted-foreground">Store management</p>
    </div>

    <div className="border-b border-border/60 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-subtle text-sm font-bold text-brand">
          {adminUser.user?.name?.charAt(0).toUpperCase() || "A"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{adminUser.user?.name || "Admin"}</p>
          <p className="truncate text-xs capitalize text-muted-foreground">
            {adminUser.role?.name?.replace("_", " ") ?? "admin"}
          </p>
        </div>
      </div>
    </div>

    <NavLinks pathname={pathname} items={filteredNavigation} onNavigate={onNavigate} />

    <div className="mt-auto border-t border-border/60 p-3">
      <Link href="/" onClick={onNavigate}>
        <Button variant="outline" size="sm" className="w-full rounded-xl">
          Back to storefront
        </Button>
      </Link>
    </div>
  </div>
  );
}

export function AdminSidebar({ adminUser, mobileOnly = false }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!pathname?.startsWith("/admin")) {
    return null;
  }

  const hasPermission = (permission: keyof typeof adminUser.role.permissions) =>
    adminUser.role?.permissions?.[permission] === true;

  const filteredNavigation = navigationItems.filter((item) =>
    hasPermission(item.permission),
  );

  if (mobileOnly) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Open admin menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Admin navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col bg-card">
            <SidebarContent
              adminUser={adminUser}
              pathname={pathname}
              filteredNavigation={filteredNavigation}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="admin-sidebar hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <SidebarContent
        adminUser={adminUser}
        pathname={pathname}
        filteredNavigation={filteredNavigation}
      />
    </aside>
  );
}
