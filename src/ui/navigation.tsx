"use client"

import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { useCart } from "@/lib/cart-context"
import { CartSheet } from "@/ui/cart-sheet"
import { Menu, Search, ShoppingCart, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useCurrentUser } from "@/lib/auth-client"
import { Skeleton } from "@/ui/primitives/skeleton"
import { ThemeToggle } from "@/ui/components/theme-toggle"
import { NavigationUserInfo } from "@/ui/components/navigation-user-info"

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { totalItems } = useCart()
  const { isPending, user } = useCurrentUser()

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="section-container flex items-center justify-between h-16">
        <Link href="/" className="font-serif text-2xl font-bold text-primary">
          LeafyVibesTea
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          <Link href="/" className="text-foreground hover:text-primary transition">
            Home
          </Link>
          <Link href="/shop" className="text-foreground hover:text-primary transition">
            Shop
          </Link>
          <Link href="/about" className="text-foreground hover:text-primary transition">
            About
          </Link>
          <Link href="/contact" className="text-foreground hover:text-primary transition">
            Contact
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="hidden md:flex"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Link href="/cart" className="relative">
            <ShoppingCart className="w-6 h-6 text-foreground hover:text-primary transition" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {totalItems}
              </span>
            )}
          </Link>

          {isPending ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : user ? (
            <NavigationUserInfo />
          ) : (
            <>
              <ThemeToggle />
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
            </>
          )}

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="border-t border-border pb-4 pt-4 animate-in fade-in slide-in-from-top-2">
          <Input type="search" placeholder="Search for teas..." className="max-w-md mx-auto" />
        </div>
      )}

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden border-t border-border bg-card">
          <div className="section-container py-4 flex flex-col gap-4">
            <Link href="/" className="text-foreground hover:text-primary transition" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
            <Link href="/shop" className="text-foreground hover:text-primary transition" onClick={() => setIsMenuOpen(false)}>
              Shop
            </Link>
            <Link href="/about" className="text-foreground hover:text-primary transition" onClick={() => setIsMenuOpen(false)}>
              About
            </Link>
            <Link href="/contact" className="text-foreground hover:text-primary transition" onClick={() => setIsMenuOpen(false)}>
              Contact
            </Link>
            {!user && (
              <div className="flex gap-2 pt-2 border-t border-border">
                <Link href="/auth/sign-in" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">Log in</Button>
                </Link>
                <Link href="/auth/sign-up" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button size="sm" className="w-full">Sign up</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}

      <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  )
}
