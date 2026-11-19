import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable, inventoryTable, inventoryTransactionTable } from "@/db/schema";
import { and, eq, like, ne } from "drizzle-orm";
import { revalidateCatalog } from "@/lib/products/revalidate";

/** Parses an optional money field: "" / null = cleared, invalid = not ok. */
function parseMoney(value: unknown): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === "") return { ok: true, value: null };
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return { ok: false };
  return { ok: true, value: (Math.round(n * 100) / 100).toFixed(2) };
}

function parseCount(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

const MONEY_FIELDS = [
  "price",
  "originalPrice",
  "customerPrice",
  "retailPrice",
  "wholesalePrice",
  "wholesalePrice2",
  "distributorPrice",
] as const;

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
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
      const {
        name,
        description,
        shortDescription,
        categoryId,
        sku,
        barcode,
        fdaRegNumber,
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

      // Validate money up front so bad input is a 400, not a DB error.
      const money: Partial<Record<(typeof MONEY_FIELDS)[number], string | null>> = {};
      for (const key of MONEY_FIELDS) {
        if (body[key] === undefined) continue;
        const parsed = parseMoney(body[key]);
        if (!parsed.ok) {
          return NextResponse.json(
            { error: `${key} must be a non-negative number` },
            { status: 400 },
          );
        }
        money[key] = parsed.value;
      }
      if (money.price === null) {
        return NextResponse.json({ error: "price cannot be empty" }, { status: 400 });
      }

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

      // Create slug from name if name is being updated (kept unique across products)
      let slug = existingProduct.slug;
      if (name && name !== existingProduct.name) {
        const baseSlug =
          name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
          'product';
        // Only fetch candidate collisions, not every slug in the catalogue.
        const existingSlugRows = await db
          .select({ slug: productTable.slug })
          .from(productTable)
          .where(
            and(
              like(productTable.slug, `${baseSlug}%`),
              ne(productTable.id, existingProduct.id),
            ),
          );
        const existingSlugs = new Set(existingSlugRows.map((p) => p.slug));
        slug = baseSlug;
        let slugCounter = 2;
        while (existingSlugs.has(slug)) {
          slug = `${baseSlug}-${slugCounter++}`;
        }
      }

      // Update product
      const updatedProduct = {
        ...existingProduct,
        name: name || existingProduct.name,
        slug,
        description: description !== undefined ? description : existingProduct.description,
        shortDescription: shortDescription !== undefined ? shortDescription : existingProduct.shortDescription,
        categoryId: categoryId || existingProduct.categoryId,
        price: money.price ?? existingProduct.price,
        originalPrice: money.originalPrice !== undefined ? money.originalPrice : existingProduct.originalPrice,
        customerPrice: money.customerPrice !== undefined ? money.customerPrice : existingProduct.customerPrice,
        retailPrice: money.retailPrice !== undefined ? money.retailPrice : existingProduct.retailPrice,
        wholesalePrice: money.wholesalePrice !== undefined ? money.wholesalePrice : existingProduct.wholesalePrice,
        wholesalePrice2: money.wholesalePrice2 !== undefined ? money.wholesalePrice2 : existingProduct.wholesalePrice2,
        distributorPrice: money.distributorPrice !== undefined ? money.distributorPrice : existingProduct.distributorPrice,
        sku: sku || existingProduct.sku,
        barcode: barcode !== undefined ? barcode : existingProduct.barcode,
        fdaRegNumber:
          fdaRegNumber !== undefined
            ? (typeof fdaRegNumber === "string" && fdaRegNumber.trim() ? fdaRegNumber.trim().slice(0, 60) : null)
            : existingProduct.fdaRegNumber,
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

      const now = new Date();
      await db.transaction(async (tx) => {
        await tx.update(productTable).set(updatedProduct).where(eq(productTable.id, params.id));

        const touchesInventory =
          finalizeReservations === true ||
          lowStockThreshold !== undefined ||
          reorderPoint !== undefined ||
          reorderQuantity !== undefined ||
          quantityInStock !== undefined ||
          quantityReserved !== undefined;
        if (!touchesInventory) return;

        // Lock the row so a concurrent order confirmation (moveStock) can't
        // interleave between this read and write and have its deduction lost.
        const [inventory] = await tx
          .select()
          .from(inventoryTable)
          .where(eq(inventoryTable.productId, params.id))
          .for("update");
        if (!inventory) return;

        let nextInStock = inventory.quantityInStock;
        let nextReserved = inventory.quantityReserved;
        if (finalizeReservations === true) {
          nextInStock = inventory.quantityInStock - inventory.quantityReserved;
          nextReserved = 0;
        } else {
          nextInStock = parseCount(quantityInStock) ?? nextInStock;
          nextReserved = parseCount(quantityReserved) ?? nextReserved;
        }

        const delta = nextInStock - inventory.quantityInStock;
        await tx
          .update(inventoryTable)
          .set({
            lowStockThreshold: parseCount(lowStockThreshold) ?? inventory.lowStockThreshold,
            reorderPoint: parseCount(reorderPoint) ?? inventory.reorderPoint,
            reorderQuantity: parseCount(reorderQuantity) ?? inventory.reorderQuantity,
            quantityInStock: nextInStock,
            quantityReserved: nextReserved,
            // Not clamped: negative availability (oversold) must stay visible.
            quantityAvailable: nextInStock - nextReserved,
            lastRestocked: delta > 0 ? now : inventory.lastRestocked,
            lastCounted: delta !== 0 ? now : inventory.lastCounted,
            updatedAt: now,
          })
          .where(eq(inventoryTable.id, inventory.id));

        // Keep the stock ledger in step with every manual stock change.
        if (delta !== 0) {
          await tx.insert(inventoryTransactionTable).values({
            id: crypto.randomUUID(),
            productId: params.id,
            type: "adjustment",
            quantity: delta,
            reason: finalizeReservations === true ? "reservations finalized" : "manual stock edit",
            reference: "",
            notes: "",
            performedBy: adminUser.id,
            createdAt: now,
          });
        }
      });

      revalidateCatalog();

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
      revalidateCatalog();

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
