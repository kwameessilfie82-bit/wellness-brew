import Link from "next/link"

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-serif text-lg font-bold text-primary mb-4">LeafyVibesTea</h3>
            <p className="text-muted-foreground text-sm">Premium wellness teas for your daily ritual</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/shop" className="text-sm text-muted-foreground hover:text-primary transition">
                All Products
              </Link>
              <Link
                href="/shop?category=herbal"
                className="text-sm text-muted-foreground hover:text-primary transition"
              >
                Herbal
              </Link>
              <Link href="/shop?category=green" className="text-sm text-muted-foreground hover:text-primary transition">
                Green Tea
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition">
                About Us
              </Link>
              <Link href="/learn" className="text-sm text-muted-foreground hover:text-primary transition">
                Blog
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition">
                Contact
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition">
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
