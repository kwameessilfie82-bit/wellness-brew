import { NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";

import { db } from "@/db";
import { productTable, categoryTable, inventoryTable } from "@/db/schema";
import { mapProductsResponse } from "@/lib/api/products";

export async function GET() {
  try {
    // Get featured products with category information
    let featuredProducts = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        slug: productTable.slug,
        description: productTable.description,
        shortDescription: productTable.shortDescription,
        price: productTable.price,
        originalPrice: productTable.originalPrice,
        sku: productTable.sku,
        barcode: productTable.barcode,
        images: productTable.images,
        isActive: productTable.isActive,
        isFeatured: productTable.isFeatured,
        quantityAvailable: inventoryTable.quantityAvailable,
        manufacturer: productTable.manufacturer,
        categoryId: productTable.categoryId,
        categoryName: categoryTable.name,
        createdAt: productTable.createdAt,
        updatedAt: productTable.updatedAt,
        createdBy: productTable.createdBy,
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
      .where(and(
        eq(productTable.isActive, true),
        eq(productTable.isFeatured, true)
      ))
      .orderBy(desc(productTable.createdAt))
      .limit(30);

    // If we don't have enough featured products, get additional active products
    if (featuredProducts.length < 30) {
      const additionalProducts = await db
        .select({
          id: productTable.id,
          name: productTable.name,
          slug: productTable.slug,
          description: productTable.description,
          shortDescription: productTable.shortDescription,
          price: productTable.price,
          originalPrice: productTable.originalPrice,
          sku: productTable.sku,
          barcode: productTable.barcode,
          images: productTable.images,
          isActive: productTable.isActive,
          isFeatured: productTable.isFeatured,
          quantityAvailable: inventoryTable.quantityAvailable,
          manufacturer: productTable.manufacturer,
          categoryId: productTable.categoryId,
          categoryName: categoryTable.name,
          createdAt: productTable.createdAt,
          updatedAt: productTable.updatedAt,
          createdBy: productTable.createdBy,
        })
        .from(productTable)
        .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
        .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
        .where(eq(productTable.isActive, true))
        .orderBy(desc(productTable.createdAt))
        .limit(30 - featuredProducts.length);

      // Combine featured and additional products, avoiding duplicates
      const existingIds = new Set(featuredProducts.map(p => p.id));
      const uniqueAdditionalProducts = additionalProducts.filter(p => !existingIds.has(p.id));
      featuredProducts = [...featuredProducts, ...uniqueAdditionalProducts];
    }

    // Filter out products with no inventory or zero stock (optional - you can remove this if you want to show all)
    const productsWithStock = featuredProducts.filter(p => 
      p.quantityAvailable === null || p.quantityAvailable === undefined || p.quantityAvailable > 0
    );

    const normalized = mapProductsResponse(
      productsWithStock as Record<string, unknown>[],
    );

    return NextResponse.json(
      { products: normalized },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured products" },
      { status: 500 }
    );
  }
}
