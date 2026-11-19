import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { productTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { parseProductDetails } from "@/lib/products/details";
import { getSettings } from "@/lib/settings/get";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";
import { Button } from "@/ui/primitives/button";

import { DetailsEditor } from "./details-editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Product details" };

export default async function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("canManageInventory", `/admin/inventory/${id}/details`);
  const [[product], taxonomy, claims] = await Promise.all([
    db
      .select({
        id: productTable.id,
        name: productTable.name,
        slug: productTable.slug,
        price: productTable.price,
        description: productTable.description,
        images: productTable.images,
        fdaRegNumber: productTable.fdaRegNumber,
        details: productTable.details,
      })
      .from(productTable)
      .where(eq(productTable.id, id))
      .limit(1),
    getSettings("taxonomy"),
    getSettings("claims"),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/inventory">
          <ArrowLeft className="mr-1 h-4 w-4" /> Catalog
        </Link>
      </Button>
      <AdminPageHeader
        title={product.name}
        description="Facts customers see on the product page. Fill everything to reach a green completeness score."
      >
        <Button asChild variant="outline">
          <Link href={`/shop/${product.slug}`} target="_blank">
            View on site
          </Link>
        </Button>
      </AdminPageHeader>
      <DetailsEditor
        productId={product.id}
        price={Number(product.price)}
        base={{ description: product.description, images: product.images, fdaRegNumber: product.fdaRegNumber }}
        initial={parseProductDetails(product.details)}
        taxonomy={taxonomy}
        bannedPhrases={claims.bannedPhrases}
      />
    </div>
  );
}
