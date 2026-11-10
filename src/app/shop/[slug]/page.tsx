import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { formatPrice } from "@/lib/format";
import { toCardProduct } from "@/lib/products/card";
import {
  getActiveProductSlugs,
  getProductById,
  getProductBySlug,
  getRelatedProducts,
  type ServerProduct,
} from "@/lib/products/server";
import { breadcrumbLd, JsonLd, productLd, productPath } from "@/lib/seo/json-ld";
import { metaDescription } from "@/lib/seo/site";
import { getPublicSettings } from "@/lib/settings/get";
import { FallbackImage } from "@/ui/components/fallback-image";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { ProductCard } from "@/ui/product-card";

import { ProductPurchase } from "./product-purchase";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const rows = await getActiveProductSlugs();
    return rows.map((r) => ({ slug: r.slug }));
  } catch (error) {
    // DB unreachable at build: pages still render on first request.
    console.error("[shop] generateStaticParams failed:", error);
    return [];
  }
}

/** Slug first; an old id-based URL resolves to the product so the page can redirect. */
async function resolveProduct(param: string): Promise<{ product: ServerProduct | null; byId: boolean }> {
  const value = decodeURIComponent(param);
  const bySlug = await getProductBySlug(value);
  if (bySlug) return { product: bySlug, byId: false };
  const byId = await getProductById(value);
  return { product: byId, byId: Boolean(byId) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await resolveProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: true } };

  const title = product.seoTitle || product.name;
  const description = metaDescription(
    product.seoDescription ||
      product.shortDescription ||
      product.description ||
      `${product.name} — ${formatPrice(product.price)}`,
  );
  const canonical = productPath(product);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const { product, byId } = await resolveProduct(slug);
  if (!product) notFound();
  if (byId && product.slug) permanentRedirect(productPath(product));

  const [{ brand, compliance }, related] = await Promise.all([
    getPublicSettings(),
    getRelatedProducts(product.id, product.categoryId),
  ]);
  const inStock = product.quantityAvailable > 0;
  const categoryHref = product.categoryName
    ? `/shop?category=${encodeURIComponent(product.categorySlug || product.categoryName)}`
    : null;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(product.categoryName && categoryHref ? [{ name: product.categoryName, path: categoryHref }] : []),
    { name: product.name, path: productPath(product) },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={[productLd(product, brand.name), breadcrumbLd(crumbs)]} />
      <Navigation />

      <nav aria-label="Breadcrumb" className="section-container py-6 text-sm text-muted-foreground animate-fade-in-up">
        <ol className="flex flex-wrap items-center">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <li key={crumb.path} className="flex items-center">
                {last ? (
                  <span aria-current="page" className="text-foreground">
                    {crumb.name}
                  </span>
                ) : (
                  <>
                    <Link href={crumb.path} className="hover:text-foreground">
                      {crumb.name}
                    </Link>
                    <span className="mx-2" aria-hidden>
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <main className="section-container pb-16">
        <article className="grid grid-cols-1 gap-12 lg:grid-cols-2 animate-fade-in-up-delay-1">
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
              <p className="text-sm font-medium uppercase tracking-wider text-brand">{product.categoryName}</p>
            ) : null}
            <h1 className="font-serif text-4xl font-bold leading-tight text-heading md:text-5xl">{product.name}</h1>
            <p className="whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
              {product.description || product.shortDescription}
            </p>

            <div className="flex flex-wrap items-center gap-4 border-y border-border py-6">
              <p className="text-4xl font-bold text-brand">{formatPrice(product.price)}</p>
              {product.originalPrice ? (
                <p className="text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</p>
              ) : null}
              <Badge variant={inStock ? "default" : "destructive"}>{inStock ? "In stock" : "Out of stock"}</Badge>
            </div>

            <ProductPurchase
              product={{ id: product.id, name: product.name, price: product.price, image: product.image }}
              inStock={inStock}
            />
            {compliance.showDisclaimerOnProducts && compliance.disclaimer ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{compliance.disclaimer}</p>
            ) : null}
          </div>
        </article>

        {related.length > 0 ? (
          <section className="mt-20 animate-fade-in-up-delay-2" aria-labelledby="related-heading">
            <div className="mb-8 flex items-center justify-between">
              <h2 id="related-heading" className="font-serif text-3xl font-bold text-heading">
                You May Also Like
              </h2>
              {categoryHref ? (
                <Link href={categoryHref}>
                  <Button variant="outline" className="rounded-full">
                    View all {product.categoryName}
                  </Button>
                </Link>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={toCardProduct(p)} />
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
