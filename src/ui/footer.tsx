import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="mb-4 font-serif text-lg font-bold text-brand">LeafyVibesTea</h3>
            <p className="text-muted-foreground text-sm">Premium wellness teas for your daily ritual</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/shop" className="text-sm text-muted-foreground transition hover:text-brand">
                All Products
              </Link>
              <Link
                href="/shop?category=herbal"
                className="text-sm text-muted-foreground transition hover:text-brand"
              >
                Herbal
              </Link>
              <Link href="/shop?category=hibiscus" className="text-sm text-muted-foreground transition hover:text-brand">
                Hibiscus Tea
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-muted-foreground transition hover:text-brand">
                About Us
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground transition hover:text-brand">
                Contact
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm text-muted-foreground transition hover:text-brand">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground transition hover:text-brand">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} LeafyVibesTea. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
