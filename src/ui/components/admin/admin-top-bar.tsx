"use client";

import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";

import type { AdminUserWithDetails } from "@/db/schema";
import { Button } from "@/ui/primitives/button";
import { ThemeToggle } from "@/ui/components/theme-toggle";
import { AdminSidebar } from "@/ui/components/admin/admin-sidebar";

type AdminTopBarProps = {
  adminUser: AdminUserWithDetails;
};

export function AdminTopBar({ adminUser }: AdminTopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <AdminSidebar adminUser={adminUser} mobileOnly />
        <span className="hidden text-sm font-semibold text-foreground sm:inline">
          Manager Console
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground md:inline">
          {adminUser.user?.name ?? adminUser.user?.email}
        </span>
        <Button variant="outline" size="sm" asChild className="gap-1.5 rounded-full">
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <Store className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View store</span>
            <ExternalLink className="h-3 w-3 opacity-60 sm:hidden" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
