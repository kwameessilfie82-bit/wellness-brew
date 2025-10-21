import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable, inventoryTable } from "@/db/schema";
import { eq, like, and } from "drizzle-orm";

// GET /api/admin/products - Get all products with optional filtering
const getHandler = withAdminAuth(
  async (request: NextRequest) => {
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
        console.error("❌ URL construction failed in admin products API:", urlError);
        return NextResponse.json(
          { error: "Invalid request URL" },
          { status: 400 }
        );
      }
      
      const search = searchParams.get("search");
      const categoryId = searchParams.get("categoryId");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = (page - 1) * limit;

      const whereConditions = [];

      if (search) {
        whereConditions.push(
          like(productTable.name, `%${search}%`)
        );
      }

      if (categoryId) {
        whereConditions.push(eq(productTable.categoryId, categoryId));
      }

      const products = await db.query.productTable.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          category: true,
          inventory: true,
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
        limit,
        offset,
      });

      const totalCount = await db.$count(
        productTable,
        whereConditions.length > 0 ? and(...whereConditions) : undefined,
      );

      return NextResponse.json({
        products,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }
  },
  "canManageProducts"
);

export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return getHandler(request);
}

// POST /api/admin/products - Create new product
const postHandler = withAdminAuth(
  async (request: NextRequest, adminUser) => {
    try {
      const body = await request.json();
      const {
        name,
        slug,
        description,
        shortDescription,
        categoryId,
        price,
        originalPrice,
        sku,
        barcode,
        images,
        isActive,
        isFeatured,
        requiresPrescription,
        weight,
        dimensions,
        manufacturer,
        expiryDate,
        batchNumber,
        tags,
        seoTitle,
        seoDescription,
      } = body;

      if (!name || !slug || !categoryId || !price || !sku) {
        return NextResponse.json(
          { error: "Name, slug, category, price, and SKU are required" },
          { status: 400 }
        );
      }

      const newProduct = {
        id: `prod-${Date.now()}`,
        name,
        slug,
        description: description || "",
        shortDescription: shortDescription || "",
        categoryId,
        price,
        originalPrice: originalPrice || null,
        sku,
        barcode: barcode || "",
        images: JSON.stringify(images || []),
        isActive: isActive !== false,
        isFeatured: isFeatured === true,
        requiresPrescription: requiresPrescription === true,
        weight: weight || null,
        dimensions: dimensions ? JSON.stringify(dimensions) : null,
        manufacturer: manufacturer || "",
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        batchNumber: batchNumber || "",
        tags: tags ? JSON.stringify(tags) : null,
        seoTitle: seoTitle || "",
        seoDescription: seoDescription || "",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminUser.id,
      };

      await db.insert(productTable).values(newProduct);

      // Create inventory record for the new product
      const newInventory = {
        id: `inv-${Date.now()}`,
        productId: newProduct.id,
        quantityInStock: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        lowStockThreshold: 10,
        reorderPoint: 5,
        reorderQuantity: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(inventoryTable).values(newInventory);

      return NextResponse.json({ product: newProduct }, { status: 201 });
    } catch (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }
  },
  "canManageProducts"
);

export async function POST(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return postHandler(request);
}
