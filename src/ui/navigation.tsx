"use client";

import { Button } from "@/ui/primitives/button";
import { LiveProductSearch } from "@/ui/components/live-product-search";
import { useCart } from "@/lib/cart-context";
import { CartSheet } from "@/ui/cart-sheet";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth-client";
import { Skeleton } from "@/ui/primitives/skeleton";
import { ThemeToggle } from "@/ui/components/theme-toggle";
import { NavigationUserInfo } from "@/ui/components/navigation-user-info";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navigation() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { totalItems } = useCart();
  const { isPending, user } = useCurrentUser();

  return (
    <header className="sticky top-0 z-50 glass-nav">
      <div className="section-container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-serif text-xl font-bold tracking-tight text-brand md:text-2xl"
        >
          Wellness Brew
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-brand-subtle text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                {totalItems > 9 ? "9+" : totalItems}
              </span>
            ) : null}
          </Button>

          {isPending ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : user ? (
            <NavigationUserInfo />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/auth/sign-in">
                <Button size="sm" variant="ghost">
                  Log in
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="sm">Sign up</Button>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="rounded-full p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isSearchOpen ? (
        <div className="border-t border-border/60 px-4 py-4 animate-in fade-in slide-in-from-top-2">
          <div className="section-container">
            <LiveProductSearch
              autoFocus
              onNavigate={() => {
                setIsSearchOpen(false);
                setIsMenuOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}

      {isMenuOpen ? (
        <nav className="border-t border-border/60 bg-card/95 md:hidden animate-in fade-in slide-in-from-top-2">
          <div className="section-container flex flex-col gap-1 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-brand-subtle text-brand"
                    : "text-foreground hover:bg-muted",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && !isPending ? (
              <div className="mt-2 flex gap-2 border-t border-border pt-4">
                <Link href="/auth/sign-in" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/sign-up" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Sign up</Button>
                </Link>
              </div>
            ) : null}
          </div>
        </nav>
      ) : null}

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  );
}
