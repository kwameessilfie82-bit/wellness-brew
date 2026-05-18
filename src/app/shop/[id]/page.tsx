"use client";

import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { ProductCard } from "@/ui/product-card";
import { ShoppingCart, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { formatPrice } from "@/lib/format";
import type { StoreProduct } from "@/lib/products/normalize";
import { useCart } from "@/lib/cart-context";
import { FallbackImage } from "@/ui/components/fallback-image";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { addToCart } = useCart();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const response = await fetch(`/api/products?id=${encodeURIComponent(id)}`);
        const data = await response.json();
        const found = data.products?.[0] as StoreProduct | undefined;

        if (found) {
          setProduct(found);
          if (found.categoryName) {
            const relatedRes = await fetch(
              `/api/products?category=${encodeURIComponent(found.categoryName)}&limit=4`,
            );
            const relatedData = await relatedRes.json();
            setRelatedProducts(
              (relatedData.products as StoreProduct[])?.filter(
                (p) => p.id !== found.id,
              ) ?? [],
            );
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navigation />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-2xl font-bold">Product not found</h1>
          <Link href="/shop">
            <Button>Back to Shop</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const inStock = product.quantityAvailable > 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <div className="section-container py-6 text-sm text-muted-foreground animate-fade-in-up">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link href="/shop" className="hover:text-foreground">
          Shop
        </Link>
        {product.categoryName ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/shop?category=${encodeURIComponent(product.categoryName)}`}
              className="hover:text-foreground"
            >
              {product.categoryName}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-foreground">{product.name}</span>
      </div>

      <div className="section-container pb-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 animate-fade-in-up-delay-1">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-lg">
            <FallbackImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          <div className="flex flex-col justify-center space-y-6">
            {product.categoryName ? (
              <p className="text-sm font-medium uppercase tracking-wider text-brand">
                {product.categoryName}
              </p>
            ) : null}
            <h1 className="font-serif text-4xl font-bold leading-tight text-heading md:text-5xl">
              {product.name}
            </h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              {product.description || product.shortDescription}
            </p>

            <div className="flex flex-wrap items-center gap-4 border-y border-border py-6">
              <p className="text-4xl font-bold text-brand">
                {formatPrice(product.price)}
              </p>
              {product.originalPrice ? (
                <p className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </p>
              ) : null}
              <Badge variant={inStock ? "default" : "destructive"}>
                {inStock
                  ? `${product.quantityAvailable} in stock`
                  : "Out of stock"}
              </Badge>
            </div>

            <Button
              size="lg"
              className="h-12 rounded-full text-base"
              disabled={!inStock}
              onClick={() =>
                addToCart({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                })
              }
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
          </div>
        </div>

        {relatedProducts.length > 0 ? (
          <section className="mt-20 animate-fade-in-up-delay-2">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-serif text-3xl font-bold text-heading">You May Also Like</h2>
              {product.categoryName ? (
                <Link href={`/shop?category=${encodeURIComponent(product.categoryName)}`}>
                  <Button variant="outline" className="rounded-full">
                    View all {product.categoryName}
                  </Button>
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard
                  key={related.id}
                  product={{
                    id: related.id,
                    name: related.name,
                    price: related.price,
                    image: related.image,
                    description: related.shortDescription || related.description || undefined,
                    category: related.categoryName || undefined,
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Footer />
    </div>
  );
}
