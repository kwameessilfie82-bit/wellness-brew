import { NextRequest, NextResponse } from "next/server";
import { eq, and, ilike, desc, or, sql } from "drizzle-orm";

import { getAppBaseUrl } from "@/lib/app-url";
import { db } from "@/db";
import { productTable, categoryTable, inventoryTable } from "@/db/schema";
import { mapProductsResponse } from "@/lib/api/products";

export async function GET(request: NextRequest) {
  try {
    // Safe URL construction
    let searchParams: URLSearchParams;
    try {
      if (!request.url) {
        throw new Error("Request URL is undefined");
      }
      
      let url: URL;
      if (request.url.startsWith('http')) {
        url = new URL(request.url);
      } else {
        url = new URL(request.url, getAppBaseUrl(request));
      }
      searchParams = url.searchParams;
    } catch (urlError) {
      console.error("❌ URL construction failed in products API:", urlError);
      return NextResponse.json(
        { error: "Invalid request URL" },
        { status: 400 }
      );
    }
    
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const slug = searchParams.get("slug");
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [
      eq(productTable.isActive, true),
      // Only show products from active categories (or products without categories)
      or(
        eq(categoryTable.isActive, true),
        sql`${categoryTable.id} IS NULL`
      )!
    ];

    if (category && category !== "all") {
      // Find category by slug or name
      const categoryRecord = await db.query.categoryTable.findFirst({
        where: or(
          eq(categoryTable.slug, category),
          ilike(categoryTable.name, `%${category}%`)
        ),
      });
      
      if (categoryRecord) {
        whereConditions.push(eq(productTable.categoryId, categoryRecord.id));
      }
    }

    if (search) {
      const pattern = `%${search}%`;
      whereConditions.push(
        or(
          ilike(productTable.name, pattern),
          ilike(productTable.sku, pattern),
          ilike(productTable.shortDescription, pattern),
          ilike(productTable.description, pattern),
        )!,
      );
    }

    if (slug) {
      whereConditions.push(eq(productTable.slug, slug));
    }

    if (id) {
      whereConditions.push(eq(productTable.id, id));
    }

    // Get products with category and inventory information
    const products = await db
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
        images: productTable.images, // This is a JSON string
        isActive: productTable.isActive,
        isFeatured: productTable.isFeatured,
        manufacturer: productTable.manufacturer,
        categoryId: productTable.categoryId,
        categoryName: categoryTable.name,
        createdAt: productTable.createdAt,
        updatedAt: productTable.updatedAt,
        createdBy: productTable.createdBy,
        quantityAvailable: inventoryTable.quantityAvailable,
      })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .leftJoin(inventoryTable, eq(productTable.id, inventoryTable.productId))
      .where(and(...whereConditions))
      .orderBy(desc(productTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination (efficient count by filter)
    // Need to join with category table for count as well
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(productTable)
      .leftJoin(categoryTable, eq(productTable.categoryId, categoryTable.id))
      .where(and(...whereConditions));
    const totalCount = Number(countResult[0]?.count || 0);

    const normalized = mapProductsResponse(
      products as Record<string, unknown>[],
    );

    return NextResponse.json(
      {
        products: normalized,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
