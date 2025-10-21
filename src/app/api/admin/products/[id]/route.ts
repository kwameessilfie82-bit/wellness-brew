import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/admin/products/[id] - Get product by ID
const getHandler = withAdminAuth(
  async (_request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const product = await db.query.productTable.findFirst({
        where: eq(productTable.id, params.id),
        with: {
          category: true,
          inventory: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ product });
    } catch (error) {
      console.error("Error fetching product:", error);
      return NextResponse.json(
        { error: "Failed to fetch product" },
        { status: 500 }
      );
    }
  },
  "canManageProducts"
);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getHandler(request, { params: { id } });
}

// PUT /api/admin/products/[id] - Update product
const putHandler = withAdminAuth(
  async (request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
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

      const existingProduct = await db.query.productTable.findFirst({
        where: eq(productTable.id, params.id),
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      const updatedProduct = {
        ...existingProduct,
        name: name || existingProduct.name,
        slug: slug || existingProduct.slug,
        description: description !== undefined ? description : existingProduct.description,
        shortDescription: shortDescription !== undefined ? shortDescription : existingProduct.shortDescription,
        categoryId: categoryId || existingProduct.categoryId,
        price: price || existingProduct.price,
        originalPrice: originalPrice !== undefined ? originalPrice : existingProduct.originalPrice,
        sku: sku || existingProduct.sku,
        barcode: barcode !== undefined ? barcode : existingProduct.barcode,
        images: images !== undefined ? JSON.stringify(images) : existingProduct.images,
        isActive: isActive !== undefined ? isActive : existingProduct.isActive,
        isFeatured: isFeatured !== undefined ? isFeatured : existingProduct.isFeatured,
        requiresPrescription: requiresPrescription !== undefined ? requiresPrescription : existingProduct.requiresPrescription,
        weight: weight !== undefined ? weight : existingProduct.weight,
        dimensions: dimensions !== undefined ? JSON.stringify(dimensions) : existingProduct.dimensions,
        manufacturer: manufacturer !== undefined ? manufacturer : existingProduct.manufacturer,
        expiryDate: expiryDate ? new Date(expiryDate) : existingProduct.expiryDate,
        batchNumber: batchNumber !== undefined ? batchNumber : existingProduct.batchNumber,
        tags: tags !== undefined ? JSON.stringify(tags) : existingProduct.tags,
        seoTitle: seoTitle !== undefined ? seoTitle : existingProduct.seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : existingProduct.seoDescription,
        updatedAt: new Date(),
      };

      await db.update(productTable)
        .set(updatedProduct)
        .where(eq(productTable.id, params.id));

      return NextResponse.json({ product: updatedProduct });
    } catch (error) {
      console.error("Error updating product:", error);
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }
  },
  "canManageProducts"
);

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return putHandler(request, { params: { id } });
}

// DELETE /api/admin/products/[id] - Delete product
const deleteHandler = withAdminAuth(
  async (_request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const existingProduct = await db.query.productTable.findFirst({
        where: eq(productTable.id, params.id),
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      await db.delete(productTable)
        .where(eq(productTable.id, params.id));

      return NextResponse.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      return NextResponse.json(
        { error: "Failed to delete product" },
        { status: 500 }
      );
    }
  },
  "canManageProducts"
);

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return deleteHandler(request, { params: { id } });
}
