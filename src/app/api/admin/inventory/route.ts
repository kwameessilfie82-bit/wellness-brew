import { NextRequest, NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { inventoryTable, inventoryTransactionTable, productTable } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidateCatalog } from "@/lib/products/revalidate";
import {
  fetchInventoryList,
  fetchInventoryStats,
} from "@/lib/queries/inventory";

function parseSearchParams(request: NextRequest) {
  const url = new URL(
    request.url,
    request.url.startsWith("http")
      ? undefined
      : getAppBaseUrl(request),
  );

  return {
    search: url.searchParams.get("search"),
    categoryId: url.searchParams.get("categoryId"),
    status: url.searchParams.get("status"),
    minimal:
      url.searchParams.get("minimal") === "1" ||
      url.searchParams.get("minimal") === "true",
    page: Math.max(1, parseInt(url.searchParams.get("page") || "1", 10)),
    limit: Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get("limit") || "100", 10)),
    ),
  };
}

const getHandler = withAdminAuth(async (request) => {
  try {
    const { search, categoryId, status, minimal, page, limit } =
      parseSearchParams(request);

    const [{ products, pagination }, minimalStats] = await Promise.all([
      fetchInventoryList({ search, categoryId, status, page, limit }),
      // Stats ride along so the stats bar stays in sync with the table.
      minimal ? fetchInventoryStats() : Promise.resolve(null),
    ]);

    if (minimal) {
      // Admin inventory must always be fresh — a stale HTTP cache here made
      // renamed/edited products appear to "not update" after saving.
      return NextResponse.json(
        { products, pagination, stats: minimalStats },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const [stats, recentTransactions] = await Promise.all([
      fetchInventoryStats(),
      db.query.inventoryTransactionTable.findMany({
        columns: {
          id: true,
          productId: true,
          type: true,
          quantity: true,
          reason: true,
          reference: true,
          notes: true,
          performedBy: true,
          createdAt: true,
        },
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
        limit: 20,
      }),
    ]);

    return NextResponse.json({
      products,
      recentTransactions,
      stats,
      pagination,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}, "canManageInventory");

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return getHandler(request);
}

// POST /api/admin/inventory - Create product or make inventory adjustment
const postHandler = withAdminAuth(
  async (request: NextRequest, adminUser) => {
    try {
      const body = await request.json();
      const { action } = body;

      if (action === "create-product") {
        const {
          name,
          description,
          shortDescription,
          categoryId,
          price,
          originalPrice,
          customerPrice,
          retailPrice,
          wholesalePrice,
          wholesalePrice2,
          distributorPrice,
          sku,
          barcode,
          fdaRegNumber,
          images,
          isActive = true,
          isFeatured = false,
          requiresPrescription = false,
          weight,
          dimensions,
          manufacturer,
          expiryDate,
          batchNumber,
          tags,
          seoTitle,
          seoDescription,
          initialStock = 0,
          lowStockThreshold = 10,
          reorderPoint = 5,
          reorderQuantity = 50,
        } = body;

        if (!name || !categoryId || !price) {
          return NextResponse.json(
            { error: "Name, category, and price are required" },
            { status: 400 },
          );
        }

        const finalSku =
          sku ||
          `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const existingProduct = await db.query.productTable.findFirst({
          where: eq(productTable.sku, finalSku),
        });
        if (existingProduct) {
          return NextResponse.json(
            { error: "Product with this SKU already exists" },
            { status: 400 },
          );
        }

        const baseSlug =
          name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || "product";
        const existingSlugRows = await db.query.productTable.findMany({
          columns: { slug: true },
        });
        const existingSlugs = new Set(existingSlugRows.map((p) => p.slug));
        let slug = baseSlug;
        let slugCounter = 2;
        while (existingSlugs.has(slug)) {
          slug = `${baseSlug}-${slugCounter++}`;
        }

        const newProduct = {
          id: `prod-${Date.now()}`,
          name,
          slug,
          description: description || "",
          shortDescription: shortDescription || "",
          categoryId,
          price: price.toString(),
          originalPrice: originalPrice ? originalPrice.toString() : null,
          customerPrice: customerPrice !== undefined && customerPrice !== "" && !isNaN(Number(customerPrice)) ? Number(customerPrice).toString() : null,
          retailPrice: retailPrice !== undefined && retailPrice !== "" && !isNaN(Number(retailPrice)) ? Number(retailPrice).toString() : null,
          wholesalePrice: wholesalePrice !== undefined && wholesalePrice !== "" && !isNaN(Number(wholesalePrice)) ? Number(wholesalePrice).toString() : null,
          wholesalePrice2: wholesalePrice2 !== undefined && wholesalePrice2 !== "" && !isNaN(Number(wholesalePrice2)) ? Number(wholesalePrice2).toString() : null,
          distributorPrice: distributorPrice !== undefined && distributorPrice !== "" && !isNaN(Number(distributorPrice)) ? Number(distributorPrice).toString() : null,
          sku: finalSku,
          barcode: barcode || "",
          fdaRegNumber: typeof fdaRegNumber === "string" && fdaRegNumber.trim() ? fdaRegNumber.trim().slice(0, 60) : null,
          images: Array.isArray(images)
            ? JSON.stringify(images)
            : (() => {
                try {
                  const parsed =
                    typeof images === "string" ? JSON.parse(images) : [];
                  return JSON.stringify(
                    Array.isArray(parsed) ? parsed : [],
                  );
                } catch {
                  return JSON.stringify(["/placeholder.svg"]);
                }
              })(),
          isActive,
          isFeatured,
          requiresPrescription,
          weight: weight ? weight.toString() : null,
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

        const newInventory = {
          id: crypto.randomUUID(),
          productId: newProduct.id,
          quantityInStock: Math.max(0, initialStock),
          quantityReserved: 0,
          quantityAvailable: Math.max(0, initialStock),
          lowStockThreshold,
          reorderPoint,
          reorderQuantity,
          lastCounted: new Date(),
          lastRestocked: initialStock > 0 ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Product + its inventory row are created atomically.
        await db.transaction(async (tx) => {
          await tx.insert(productTable).values(newProduct);
          await tx.insert(inventoryTable).values(newInventory);
        });
        revalidateCatalog();

        return NextResponse.json(
          {
            message: "Product created successfully",
            product: newProduct,
          },
          { status: 201 },
        );
      }

      if (action === "adjust-inventory") {
        const { productId, type, quantity, reason, reference, notes } = body;

        if (!productId || !type || quantity === undefined || !reason) {
          return NextResponse.json(
            { error: "Product ID, type, quantity, and reason are required" },
            { status: 400 },
          );
        }

        if (!["in", "out", "adjustment"].includes(type)) {
          return NextResponse.json(
            {
              error: "Invalid adjustment type. Must be 'in', 'out', or 'adjustment'",
            },
            { status: 400 },
          );
        }

        if (!Number.isInteger(quantity) || quantity === 0) {
          return NextResponse.json(
            { error: "Quantity must be a non-zero whole number" },
            { status: 400 },
          );
        }

        const delta =
          type === "in"
            ? Math.abs(quantity)
            : type === "out"
              ? -Math.abs(quantity)
              : quantity;
        const now = new Date();
        const transaction = {
          id: crypto.randomUUID(),
          productId,
          type,
          quantity: delta,
          reason,
          reference: reference || "",
          notes: notes || "",
          performedBy: adminUser.id,
          createdAt: now,
        };

        // Validate, ledger and stock move in one transaction. The update is a
        // relative SQL expression, so it composes with concurrent order
        // confirmations instead of overwriting them.
        const outcome = await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(inventoryTable)
            .set({
              quantityInStock: sql`${inventoryTable.quantityInStock} + ${delta}`,
              quantityAvailable: sql`${inventoryTable.quantityAvailable} + ${delta}`,
              lastCounted: now,
              ...(delta > 0 ? { lastRestocked: now } : {}),
              updatedAt: now,
            })
            .where(eq(inventoryTable.productId, productId))
            .returning({ id: inventoryTable.id });

          if (!updated) {
            if (delta < 0) return "no-inventory" as const;
            const product = await tx.query.productTable.findFirst({
              where: eq(productTable.id, productId),
              columns: { id: true },
            });
            if (!product) return "no-product" as const;
            await tx.insert(inventoryTable).values({
              id: crypto.randomUUID(),
              productId,
              quantityInStock: delta,
              quantityReserved: 0,
              quantityAvailable: delta,
              lowStockThreshold: 10,
              reorderPoint: 5,
              reorderQuantity: 50,
              lastCounted: now,
              lastRestocked: now,
              createdAt: now,
              updatedAt: now,
            });
          }

          await tx.insert(inventoryTransactionTable).values(transaction);
          return "ok" as const;
        });

        if (outcome === "no-inventory") {
          return NextResponse.json(
            { error: "Cannot decrease stock for a product with no existing inventory" },
            { status: 400 },
          );
        }
        if (outcome === "no-product") {
          return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        revalidateCatalog();
        return NextResponse.json({
          message: "Inventory adjustment successful",
          transaction,
        });
      }

      return NextResponse.json(
        { error: "Invalid action. Must be 'create-product' or 'adjust-inventory'" },
        { status: 400 },
      );
    } catch (error) {
      console.error("Error in inventory operation:", error);
      return NextResponse.json(
        {
          error: "Failed to process request",
        },
        { status: 500 },
      );
    }
  },
  "canManageInventory",
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return postHandler(request);
}
