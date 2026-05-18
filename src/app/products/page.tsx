import { ProductsPageClient } from "@/ui/components/products-page-client";

async function getProductsData(searchParams: URLSearchParams) {
  try {
    const params = new URLSearchParams();
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = searchParams.get("page") || "1";

    if (category) params.set("category", category);
    if (search) params.set("search", search);
    params.set("page", page);

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' || 'https://wellness-brew.vercel.app'}/api/products?${params.toString()}`, {
      cache: 'no-store'
    });
    
    const data = await response.json();
    return {
      products: data.products || [],
      pagination: data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 }
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return {
      products: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 }
    };
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const urlSearchParams = new URLSearchParams();
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (value) {
      urlSearchParams.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  const { products, pagination } = await getProductsData(urlSearchParams);

  return (
    <ProductsPageClient 
      initialProducts={products} 
      initialPagination={pagination} 
    />
  );
}