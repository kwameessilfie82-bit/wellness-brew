"use client";

import { /*Menu, X,*/ Home, Package, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { SEO_CONFIG } from "@/app";
import { useCurrentUser } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import dynamic from "next/dynamic";

import { Button } from "@/ui/primitives/button";
import { Skeleton } from "@/ui/primitives/skeleton";

const NotificationsWidget = dynamic(
  () => import("../notifications/notifications-widget").then((m) => m.NotificationsWidget),
  { ssr: false, loading: () => null },
);
import { HeaderUserDropdown } from "./header-user";
// import { DynamicCategoryNavigation } from "./dynamic-category-navigation";
import { DynamicMobileCategories } from "./dynamic-mobile-categories";
import { AdminSidebar } from "../admin/admin-sidebar";
import type { AdminUserWithDetails } from "@/db/schema";

interface HeaderProps {
  children?: React.ReactNode;
  showAuth?: boolean;
  adminUser?: AdminUserWithDetails;
}

export function Header({ showAuth = true, adminUser }: HeaderProps) {
  const pathname = usePathname();
  const { isPending, user } = useCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUserWithDetails | null>(adminUser || null);

  // Fetch admin user information if not provided
  useEffect(() => {
    if (!adminUser && user) {
      const fetchAdminUser = async () => {
        try {
          const response = await fetch("/api/admin/me");
          const data = await response.json();

          if (data.isAdmin) {
            setCurrentAdminUser(
              data.adminUser ?? {
                role: data.role,
              },
            );
          } else {
            setCurrentAdminUser(null);
          }
        } catch (error) {
          console.error('Error fetching admin user:', error);
          setCurrentAdminUser(null);
        }
      };
      fetchAdminUser();
    }
  }, [adminUser, user]);

  // const mainNavigation = [
  //   { href: "/", name: "Home" },
  //   { href: "/products", name: "Products" },
  // ];
  const mainNavigation: { href: string; name: string }[] = [];

  // Always use main navigation throughout the UI
  const navigation = mainNavigation;

  const renderContent = () => (
    <header
      className={`
        sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur
        supports-[backdrop-filter]:bg-background/60
      `}
    >
      <div
        className={`
          container mx-auto max-w-7xl px-2
          sm:px-6
          lg:px-8
        `}
      >
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6">
            {/* Admin Mobile Menu Button */}
            {currentAdminUser && (
              <div className="lg:hidden">
                <AdminSidebar adminUser={currentAdminUser} />
              </div>
            )}
            
            <Link className="flex items-center gap-2" href="/">
              <span
                className={cn(
                  "text-xl font-bold",
                  `
                    bg-gradient-to-r from-primary to-primary/70 bg-clip-text
                    tracking-tight text-transparent
                  `,
                )}
              >
                {SEO_CONFIG.name}
              </span>
            </Link>
            <nav
              className={`
                hidden
                md:flex
              `}
            >
              <ul className="flex items-center gap-6">
                {/* Navigation links commented out for inventory system */}
                {/* {navigation.map(...)} */}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-4">

            {isPending ? (
              <Skeleton className="h-9 w-9 rounded-full" />
            ) : (
              <NotificationsWidget />
            )}

            {showAuth && (
              <>
                {user ? (
                  <HeaderUserDropdown
                    isDashboard={false}
                    userEmail={user.email}
                    userImage={user.image}
                    userName={user.name}
                    isAdmin={Boolean(currentAdminUser)}
                    adminRole={currentAdminUser?.role?.name}
                  />
                ) : isPending ? (
                  <Skeleton className="h-10 w-32" />
                ) : (
                  <div className="hidden md:flex items-center gap-2">
                    <Link href="/auth/sign-in">
                      <Button size="sm" variant="outline">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/auth/sign-up">
                      <Button size="sm" variant="default">Sign up</Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Mobile menu button commented out for inventory system */}
            {/**
            <Button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              size="icon"
              variant="ghost"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            */}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="space-y-1 border-b px-4 py-3">
            {isPending
              ? Array.from({ length: navigation.length }).map((_, i) => (
                  <div className="py-2" key={i}>
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))
              : navigation.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href));

                  return (
                    <Link
                      className={cn(
                        "block rounded-md px-3 py-2 text-base font-medium",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : `
                            text-muted-foreground
                            hover:bg-muted/50 hover:text-primary
                          `,
                      )}
                      href={item.href}
                      key={item.name}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {item.href === "/" && <Home className="h-4 w-4" />}
                        {item.href === "/products" && <Package className="h-4 w-4" />}
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
            
            {/* Admin link (mobile) */}
            {currentAdminUser && (
              <div className="border-t pt-3 mt-3">
                <Link
                  className={cn(
                    "block rounded-md px-3 py-2 text-base font-medium text-foreground hover:bg-muted/50 hover:text-primary",
                  )}
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="inline-flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Manager&apos;s Dashboard
                  </span>
                </Link>
              </div>
            )}
            
            {/* Mobile Categories */}
            <DynamicMobileCategories onCategoryClick={() => setMobileMenuOpen(false)} />
          </div>

          {showAuth && !user && (
            <div className="border-b px-4 py-3">
              <div className="flex gap-2">
                <Link
                  className={`
                    flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium
                    hover:bg-muted/50 flex-1 justify-center
                  `}
                  href="/auth/sign-in"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Link>
                <Link
                  className={`
                    flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-base font-medium
                    text-primary-foreground hover:bg-primary/90 flex-1 justify-center
                  `}
                  href="/auth/sign-up"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserPlus className="h-4 w-4" />
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );

  return renderContent();
}
