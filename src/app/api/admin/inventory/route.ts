import { NextRequest, NextResponse } from "next/server";

import { getAppBaseUrl } from "@/lib/app-url";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { inventoryTable, inventoryTransactionTable, productTable } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const { products, pagination } = await fetchInventoryList({
      search,
      categoryId,
      status,
      page,
      limit,
    });

    if (minimal) {
      return NextResponse.json(
        { products, pagination },
        {
          headers: {
            "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
          },
        },
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
          sku,
          barcode,
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

        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        const newProduct = {
          id: `prod-${Date.now()}`,
          name,
          slug,
          description: description || "",
          shortDescription: shortDescription || "",
          categoryId,
          price: price.toString(),
          originalPrice: originalPrice ? originalPrice.toString() : null,
          sku: finalSku,
          barcode: barcode || "",
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

        await db.insert(productTable).values(newProduct);

        const newInventory = {
          id: `inv-${Date.now()}`,
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

        await db.insert(inventoryTable).values(newInventory);

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

        if (!Number.isFinite(quantity)) {
          return NextResponse.json(
            { error: "Quantity must be a finite number" },
            { status: 400 },
          );
        }

        const transaction = {
          id: `trans-${Date.now()}`,
          productId,
          type,
          quantity,
          reason,
          reference: reference || "",
          notes: notes || "",
          performedBy: adminUser.id,
          createdAt: new Date(),
        };

        await db.insert(inventoryTransactionTable).values(transaction);

        const existingInventory = await db.query.inventoryTable.findFirst({
          where: eq(inventoryTable.productId, productId),
        });

        if (!existingInventory && type === "out") {
          return NextResponse.json(
            {
              error:
                "Cannot decrease stock for a product with no existing inventory",
            },
            { status: 400 },
          );
        }

        if (existingInventory) {
          let delta = quantity;
          if (type === "in") {
            delta = Math.abs(quantity);
          } else if (type === "out") {
            delta = -Math.abs(quantity);
          }

          const newQuantity = existingInventory.quantityInStock + delta;
          const boundedQuantityInStock = Math.max(0, newQuantity);
          const newAvailable = Math.max(
            0,
            newQuantity - existingInventory.quantityReserved,
          );

          await db
            .update(inventoryTable)
            .set({
              quantityInStock: boundedQuantityInStock,
              quantityAvailable: newAvailable,
              lastCounted: new Date(),
              lastRestocked:
                delta > 0 || type === "in"
                  ? new Date()
                  : existingInventory.lastRestocked,
              updatedAt: new Date(),
            })
            .where(eq(inventoryTable.productId, productId));
        } else {
          const initialQuantity =
            type === "in" ? Math.max(0, Math.abs(quantity)) : Math.max(0, quantity);
          await db.insert(inventoryTable).values({
            id: `inv-${Date.now()}`,
            productId,
            quantityInStock: initialQuantity,
            quantityReserved: 0,
            quantityAvailable: initialQuantity,
            lowStockThreshold: 10,
            reorderPoint: 5,
            reorderQuantity: 50,
            lastCounted: new Date(),
            lastRestocked: initialQuantity > 0 ? new Date() : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

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
          details: error instanceof Error ? error.message : String(error),
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
