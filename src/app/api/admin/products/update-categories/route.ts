import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable, categoryTable } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// Helper function to determine category from product name
function getCategoryFromName(productName: string): string {
  const name = productName.toLowerCase();
  
  if (name.includes("gift box")) {
    return "Gift Boxes";
  }
  if (name.includes("paper tube")) {
    return "Paper Tubes";
  }
  if (name.includes("tin (25)")) {
    return "Tin (25)";
  }
  if (name.includes("tin (20)")) {
    return "Tin (20)";
  }
  // Default to Paper Packs if none of the above match
  return "Paper Packs";
}

const handler = withAdminAuth(async (_request: NextRequest, adminUser) => {
  try {
    // Get all categories
    const categories = await db.query.categoryTable.findMany({
      where: eq(categoryTable.isActive, true),
    });

    // Create a map of category name to category ID
    const categoryMap = new Map<string, string>();
    categories.forEach(cat => {
      categoryMap.set(cat.name, cat.id);
    });

    // Get all products
    const products = await db.query.productTable.findMany();

    // Group products by their target category
    const updatesByCategory: Record<string, string[]> = {};
    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      const targetCategoryName = getCategoryFromName(product.name);
      const targetCategoryId = categoryMap.get(targetCategoryName);

      if (!targetCategoryId) {
        console.warn(`Category "${targetCategoryName}" not found for product "${product.name}"`);
        skippedCount++;
        continue;
      }

      // Skip if already in the correct category
      if (product.categoryId === targetCategoryId) {
        skippedCount++;
        continue;
      }

      // Group updates by category for batch processing
      if (!updatesByCategory[targetCategoryId]) {
        updatesByCategory[targetCategoryId] = [];
      }
      updatesByCategory[targetCategoryId].push(product.id);
    }

    // Perform batch updates
    for (const [categoryId, productIds] of Object.entries(updatesByCategory)) {
      if (productIds.length > 0) {
        await db
          .update(productTable)
          .set({
            categoryId: categoryId,
            updatedAt: new Date(),
          })
          .where(inArray(productTable.id, productIds));
        updatedCount += productIds.length;
      }
    }

    return NextResponse.json({
      message: "Product categories updated successfully",
      updated: updatedCount,
      skipped: skippedCount,
      total: products.length,
      updatesByCategory: Object.fromEntries(
        Object.entries(updatesByCategory).map(([catId, productIds]) => {
          const cat = categories.find(c => c.id === catId);
          return [cat?.name || catId, productIds.length];
        })
      ),
    });
  } catch (error) {
    console.error("Error updating product categories:", error);
    return NextResponse.json(
      {
        error: "Failed to update product categories",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}, "canManageProducts");

export async function POST(_request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return handler(_request);
}
