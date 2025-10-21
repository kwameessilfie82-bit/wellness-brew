import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productTable, categoryTable, inventoryTable } from "@/db/schema";
import { eq, and, ilike, desc, or } from "drizzle-orm";

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
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        url = new URL(request.url, baseUrl);
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [
      eq(productTable.isActive, true)
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
      whereConditions.push(ilike(productTable.name, `%${search}%`));
    }

    if (slug) {
      whereConditions.push(eq(productTable.slug, slug));
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
        images: productTable.images,
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
    const totalCount = await db.$count(productTable, and(...whereConditions));

    return NextResponse.json({ 
      products,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
