import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { toCardProduct } from "@/lib/products/card";
import { getFeaturedProducts } from "@/lib/products/server";
import { getPublicSettings } from "@/lib/settings/get";
import { whatsappLink } from "@/lib/settings/schemas";
import { LiveProductSearch } from "@/ui/components/live-product-search";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { Button } from "@/ui/primitives/button";
import { ProductCard } from "@/ui/product-card";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const [{ brand, contact }, featured] = await Promise.all([
    getPublicSettings(),
    getFeaturedProducts(4).catch(() => []),
  ]);
  const wa = contact.whatsappNumber || contact.orderPhone;

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="hero-glow" aria-hidden />
          <div className="section-container relative z-10 mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-brand">Error 404</p>
            <h1 className="mb-5 font-serif text-4xl font-bold leading-tight text-heading md:text-6xl">
              This cup&rsquo;s gone cold
            </h1>
            <p className="mx-auto mb-8 max-w-lg text-lg text-muted-foreground">
              The page you&rsquo;re looking for has been moved, renamed or poured out. Search for a blend, or head
              back to the shop for a fresh brew.
            </p>

            <LiveProductSearch className="mx-auto mb-8 max-w-md text-left" />

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/shop">
                <Button size="lg" className="h-12 w-full rounded-full px-8 sm:w-auto">
                  Browse the shop
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="h-12 w-full rounded-full px-8 sm:w-auto">
                  Back home
                </Button>
              </Link>
              {wa ? (
                <a
                  href={whatsappLink(wa, `Hello ${brand.name}, I'd like to place an order.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" variant="ghost" className="h-12 w-full rounded-full px-8 sm:w-auto">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Order on WhatsApp
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="border-t border-border/60 bg-secondary/30 py-16" aria-labelledby="nf-featured">
            <div className="section-container">
              <h2 id="nf-featured" className="mb-8 font-serif text-3xl font-bold text-heading">
                Popular right now
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={toCardProduct(p)} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
