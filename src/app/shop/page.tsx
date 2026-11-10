import type { Metadata } from "next";

import { findCategory, getActiveCategories, getProductsPage } from "@/lib/products/server";
import { itemListLd, JsonLd } from "@/lib/seo/json-ld";
import { DEFAULT_OG_IMAGES, metaDescription } from "@/lib/seo/site";
import { getPublicSettings } from "@/lib/settings/get";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

import { ShopClient } from "./shop-client";

type Props = { searchParams: Promise<{ category?: string | string[]; search?: string | string[] }> };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function readFilters(searchParams: Props["searchParams"]) {
  const sp = await searchParams;
  return { category: first(sp.category) || "all", search: first(sp.search).slice(0, 100) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [{ category, search }, { brand, compliance }] = await Promise.all([
    readFilters(searchParams),
    getPublicSettings(),
  ]);

  if (search) {
    return {
      title: `Search: ${search}`,
      robots: { index: false, follow: true },
      alternates: { canonical: "/shop" },
    };
  }

  if (category !== "all") {
    const found = await findCategory(category).catch(() => null);
    if (found) {
      const canonical = `/shop?category=${encodeURIComponent(found.slug)}`;
      const title = `${found.name} — Shop`;
      const description = metaDescription(
        found.description || `Shop ${found.name} from ${brand.name}. Order online for delivery across Accra.`,
      );
      return { title, description, alternates: { canonical }, openGraph: { url: canonical, title, description, images: DEFAULT_OG_IMAGES } };
    }
  }

  const names = compliance.commonNames ? ` (${compliance.commonNames})` : "";
  const description = metaDescription(
    `Shop ${brand.name}'s hibiscus${names} and herbal tea blends. Order online with delivery across Accra, Ghana.`,
  );
  return {
    title: "Shop",
    description,
    alternates: { canonical: "/shop" },
    openGraph: { url: "/shop", title: `Shop | ${brand.name}`, description, images: DEFAULT_OG_IMAGES },
  };
}

export default async function ShopPage({ searchParams }: Props) {
  const { category, search } = await readFilters(searchParams);

  let initial;
  try {
    const [page, categories] = await Promise.all([
      getProductsPage({ category, search, page: 1, limit: 12 }),
      getActiveCategories(),
    ]);
    initial = {
      category,
      search,
      products: page.products,
      pagination: page.pagination,
      categories: ["all", ...categories.map((c) => c.slug || c.name)],
    };
  } catch (error) {
    // DB hiccup: render the shell and let the client fetch as before.
    console.error("[shop] server fetch failed:", error);
    initial = {
      category,
      search,
      products: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
      categories: ["all"],
    };
  }

  return (
    <div className="flex min-h-screen flex-col">
      {initial.products.length > 0 && !search ? (
        <JsonLd data={itemListLd(initial.products, category === "all" ? "Shop" : category)} />
      ) : null}
      <Navigation />
      <ShopClient key={`${category}|${search}`} initial={initial} />
      <Footer />
    </div>
  );
}
