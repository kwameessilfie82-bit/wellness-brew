import { notFound } from "next/navigation";

import { getAppBaseUrl } from "@/lib/app-url";
import { ProductDetailClient } from "@/ui/components/product-detail-client";

/* -------------------------------------------------------------------------- */
/*                               Type declarations                            */
/* -------------------------------------------------------------------------- */

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  originalPrice: string | null;
  sku: string;
  barcode: string | null;
  images: string;
  isActive: boolean;
  isFeatured: boolean;
  manufacturer: string | null;
  categoryId: string;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`${getAppBaseUrl()}/api/products?slug=${slug}`, {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.products?.[0] || null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const product = await getProduct(resolvedParams.id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
