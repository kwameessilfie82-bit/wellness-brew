"use client";

import { Award, Leaf, Sparkles, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { StoreProduct } from "@/lib/products/normalize";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { ProductCard } from "@/ui/product-card";
import { Button } from "@/ui/primitives/button";
import { cn } from "@/lib/cn";

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch("/api/products/featured");
        const data = await response.json();
        if (data.products && Array.isArray(data.products)) {
          setFeaturedProducts((data.products as StoreProduct[]).slice(0, 4));
        }
      } catch (error) {
        console.error("Error fetching featured products:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFeaturedProducts();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <section className="relative overflow-hidden bg-background pb-20 pt-20 md:pb-28 md:pt-32">
        <div className="hero-glow" aria-hidden />
        <div className="hero-pattern" aria-hidden />
        <div className="hero-bottom-blend" aria-hidden />

        <div className="section-container relative z-10">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="max-w-2xl animate-fade-in-up">
              <div className="badge-brand mb-6">
                <Sparkles className="h-4 w-4" />
                Premium wellness teas from Africa
              </div>
              <h1 className="mb-6 font-serif text-5xl font-bold leading-[1.1] tracking-tight text-heading md:text-6xl lg:text-7xl">
                Sip your way to{" "}
                <span className="text-gradient-hero">better wellness</span>
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground md:text-xl">
                Handcrafted blends enriched with herbs and spices — sourced with care,
                brewed for balance, delivered to your door.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/shop">
                  <Button size="lg" className="h-12 rounded-full px-8 text-base">
                    Shop the collection
                  </Button>
                </Link>
                <Link href="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full px-8 text-base"
                  >
                    Our story
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative h-[380px] animate-fade-in-up-delay-2 md:h-[520px]">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
              <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-white shadow-2xl">
                <Image
                  src="/hero_image.webp"
                  alt="Wellness Brew Teas — pure, organic wellness teas"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-background py-16 md:py-24">
        <div className="section-container">
          <div className="mb-12 animate-fade-in-up">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
              Curated for you
            </p>
            <h2 className="font-serif text-4xl font-bold text-heading">Featured blends</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Customer favorites — perfect for your daily ritual
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/5] animate-pulse rounded-2xl bg-muted"
                />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    description:
                      product.shortDescription || product.description || undefined,
                    category: product.categoryName || undefined,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
              <p className="text-muted-foreground">
                New blends arriving soon. Visit the shop to explore.
              </p>
              <Link href="/shop" className="mt-4 inline-block">
                <Button variant="outline" className="rounded-full">
                  Browse shop
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/40 py-20">
        <div className="section-container">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                icon: Award,
                title: "Premium quality",
                text: "Sourced from trusted growers and blended with care",
              },
              {
                icon: Truck,
                title: "Fast delivery",
                text: "Reliable shipping across Ghana on every order",
              },
              {
                icon: Leaf,
                title: "100% natural",
                text: "No artificial flavors — just pure botanical goodness",
              },
            ].map((item, i) => (
              <div
                key={item.title}
                className={cn(
                  "flex gap-4 rounded-2xl bg-card/60 p-6 backdrop-blur-sm",
                  i === 1 && "animate-fade-in-up-delay-1",
                  i === 2 && "animate-fade-in-up-delay-2",
                )}
              >
                <item.icon className="mt-1 h-8 w-8 shrink-0 text-brand" />
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-heading">{item.title}</h3>
                  <p className="text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="section-container text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold text-heading md:text-4xl">
            Ready to start your wellness journey?
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
            Join thousands who make Wellness Brew part of their daily routine.
          </p>
          <Link href="/shop">
            <Button size="lg" className="h-12 rounded-full px-10">
              Shop now
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
