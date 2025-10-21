import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable, inventoryTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/admin/inventory/[id] - Get product by ID
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
  "canManageInventory"
);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getHandler(request, { params: { id } });
}

// PUT /api/admin/inventory/[id] - Update product
const putHandler = withAdminAuth(
  async (request: NextRequest, adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const body = await request.json();
      const {
        name,
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
        lowStockThreshold,
        reorderPoint,
        reorderQuantity,
        quantityInStock,
        quantityReserved,
        finalizeReservations,
      } = body;

      // Check if product exists
      const existingProduct = await db.query.productTable.findFirst({
        where: eq(productTable.id, params.id),
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Check if SKU is being changed and if new SKU already exists
      if (sku && sku !== existingProduct.sku) {
        const skuExists = await db.query.productTable.findFirst({
          where: eq(productTable.sku, sku),
        });

        if (skuExists) {
          return NextResponse.json(
            { error: "Product with this SKU already exists" },
            { status: 400 }
          );
        }
      }

      // Create slug from name if name is being updated
      let slug = existingProduct.slug;
      if (name && name !== existingProduct.name) {
        slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      }

      // Update product
      const updatedProduct = {
        ...existingProduct,
        name: name || existingProduct.name,
        slug,
        description: description !== undefined ? description : existingProduct.description,
        shortDescription: shortDescription !== undefined ? shortDescription : existingProduct.shortDescription,
        categoryId: categoryId || existingProduct.categoryId,
        price: price ? price.toString() : existingProduct.price,
        originalPrice: originalPrice !== undefined ? (originalPrice ? originalPrice.toString() : null) : existingProduct.originalPrice,
        sku: sku || existingProduct.sku,
        barcode: barcode !== undefined ? barcode : existingProduct.barcode,
        images:
          images !== undefined
            ? (Array.isArray(images)
                ? JSON.stringify(images)
                : (() => {
                    try {
                      const parsed = typeof images === 'string' ? JSON.parse(images) : [];
                      return JSON.stringify(Array.isArray(parsed) ? parsed : []);
                    } catch {
                      return existingProduct.images;
                    }
                  })())
            : existingProduct.images,
        isActive: isActive !== undefined ? isActive : existingProduct.isActive,
        isFeatured: isFeatured !== undefined ? isFeatured : existingProduct.isFeatured,
        requiresPrescription: requiresPrescription !== undefined ? requiresPrescription : existingProduct.requiresPrescription,
        weight: weight !== undefined ? (weight ? weight.toString() : null) : existingProduct.weight,
        dimensions: dimensions !== undefined ? (dimensions ? JSON.stringify(dimensions) : null) : existingProduct.dimensions,
        manufacturer: manufacturer !== undefined ? manufacturer : existingProduct.manufacturer,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : existingProduct.expiryDate,
        batchNumber: batchNumber !== undefined ? batchNumber : existingProduct.batchNumber,
        tags: tags !== undefined ? (tags ? JSON.stringify(tags) : null) : existingProduct.tags,
        seoTitle: seoTitle !== undefined ? seoTitle : existingProduct.seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : existingProduct.seoDescription,
        updatedAt: new Date(),
      };

      await db.update(productTable)
        .set(updatedProduct)
        .where(eq(productTable.id, params.id));

      // Finalize reservations: reduce stock by reserved, set reserved to 0, recompute available
      if (finalizeReservations === true) {
        const inventory = await db.query.inventoryTable.findFirst({
          where: eq(inventoryTable.productId, params.id),
        });

        if (inventory) {
          const newQuantityInStock = Math.max(0, inventory.quantityInStock - inventory.quantityReserved);
          await db.update(inventoryTable)
            .set({
              quantityInStock: newQuantityInStock,
              quantityReserved: 0,
              quantityAvailable: newQuantityInStock,
              updatedAt: new Date(),
            })
            .where(eq(inventoryTable.productId, params.id));
        }
      } else if (
        lowStockThreshold !== undefined ||
        reorderPoint !== undefined ||
        reorderQuantity !== undefined ||
        quantityInStock !== undefined ||
        quantityReserved !== undefined
      ) {
        const inventory = await db.query.inventoryTable.findFirst({
          where: eq(inventoryTable.productId, params.id),
        });

        if (inventory) {
          const nextQuantityInStock =
            quantityInStock !== undefined ? Math.max(0, Number(quantityInStock) || 0) : inventory.quantityInStock;
          const nextQuantityReserved =
            quantityReserved !== undefined ? Math.max(0, Number(quantityReserved) || 0) : inventory.quantityReserved;
          const nextQuantityAvailable = Math.max(0, nextQuantityInStock - nextQuantityReserved);
          const increased = nextQuantityInStock > inventory.quantityInStock;
          await db.update(inventoryTable)
            .set({
              lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : inventory.lowStockThreshold,
              reorderPoint: reorderPoint !== undefined ? reorderPoint : inventory.reorderPoint,
              reorderQuantity: reorderQuantity !== undefined ? reorderQuantity : inventory.reorderQuantity,
              quantityInStock: nextQuantityInStock,
              quantityReserved: nextQuantityReserved,
              quantityAvailable: nextQuantityAvailable,
              lastRestocked: increased ? new Date() : inventory.lastRestocked,
              updatedAt: new Date(),
            })
            .where(eq(inventoryTable.productId, params.id));
        }
      }

      return NextResponse.json({ 
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Error updating product:", error);
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }
  },
  "canManageInventory"
);

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return putHandler(request, { params: { id } });
}

// DELETE /api/admin/inventory/[id] - Delete product
const deleteHandler = withAdminAuth(
  async (_request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };

      // Check if product exists
      const existingProduct = await db.query.productTable.findFirst({
        where: eq(productTable.id, params.id),
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Delete product (inventory will be deleted due to cascade)
      await db.delete(productTable).where(eq(productTable.id, params.id));

      return NextResponse.json({ 
        message: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      return NextResponse.json(
        { error: "Failed to delete product" },
        { status: 500 }
      );
    }
  },
  "canManageInventory"
);

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return deleteHandler(request, { params: { id } });
}
