import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { inventoryTable, productTable, categoryTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sampleProducts } from "@/lib/sample-products";

// Helper function to create slug from name
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

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
    const now = new Date();

    // Get all categories and create a map
    const allCategories = await db.query.categoryTable.findMany({
      where: eq(categoryTable.isActive, true),
    });
    
    const categoryMap = new Map<string, typeof allCategories[0]>();
    allCategories.forEach(cat => {
      categoryMap.set(cat.name, cat);
    });

    // Ensure all required categories exist
    const requiredCategories = [
      { name: "Tin (25)", slug: "tin-25", description: "Tea products in 25-count tins", sortOrder: 0 },
      { name: "Tin (20)", slug: "tin-20", description: "Tea products in 20-count tins", sortOrder: 1 },
      { name: "Paper Tubes", slug: "paper-tubes", description: "Tea products in paper tubes", sortOrder: 2 },
      { name: "Paper Packs", slug: "paper-packs", description: "Tea products in paper packs", sortOrder: 3 },
      { name: "Gift Boxes", slug: "gift-boxes", description: "Tea products in gift boxes", sortOrder: 4 },
    ];

    for (const reqCat of requiredCategories) {
      if (!categoryMap.has(reqCat.name)) {
        const categoryId = `cat-${reqCat.slug}`;
        await db.insert(categoryTable).values({
          id: categoryId,
          name: reqCat.name,
          slug: reqCat.slug,
          description: reqCat.description,
          isActive: true,
          sortOrder: reqCat.sortOrder,
          createdAt: now,
          updatedAt: now,
          createdBy: adminUser.id,
        });
        // Refresh categories after insert
        const newCategory = await db.query.categoryTable.findFirst({
          where: eq(categoryTable.id, categoryId),
        });
        if (newCategory) {
          categoryMap.set(reqCat.name, newCategory);
        }
      }
    }

    // Get existing products to avoid duplicates
    const existingProducts = await db.query.productTable.findMany();
    const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()));
    const existingSkus = new Set(existingProducts.map(p => p.sku));

    // Convert sample products to database format
    const productsToInsert = sampleProducts
      .filter(product => {
        const nameLower = product.name.toLowerCase();
        return !existingNames.has(nameLower);
      })
      .map((product, index) => {
        // Generate SKU from product name and ID
        const sku = `SKU-${product.id}-${product.name.substring(0, 3).toUpperCase().replace(/\s/g, '')}`;
        
        // Check if SKU already exists
        if (existingSkus.has(sku)) {
          return null;
        }

        // Determine category from product name
        const categoryName = getCategoryFromName(product.name);
        const productCategory = categoryMap.get(categoryName);
        
        if (!productCategory) {
          console.warn(`Category "${categoryName}" not found for product "${product.name}", skipping`);
          return null;
        }

        return {
          id: `prod-${product.id}`,
          name: product.name,
          slug: slugify(product.name),
          description: product.description || "",
          shortDescription: product.description || "",
          categoryId: productCategory.id,
          price: product.customerPrice.toString(), // Use customer price as the main price
          originalPrice: product.retailPrice > product.customerPrice ? product.retailPrice.toString() : null,
          sku: sku,
          barcode: `BC-${product.id}`,
          images: JSON.stringify([product.image || "/placeholder.svg"]),
          isActive: true,
          isFeatured: index < 4, // First 4 products are featured
          requiresPrescription: false,
          weight: null,
          manufacturer: "Wellness Brew",
          createdAt: now,
          updatedAt: now,
          createdBy: adminUser.id,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (productsToInsert.length === 0) {
      return NextResponse.json({
        message: "All products already exist in the database",
        inserted: 0,
        updated: 0,
      });
    }

    // Insert products
    await db.insert(productTable).values(productsToInsert);

    // Create inventory records with random stock values
    const inventoryRecords = productsToInsert.map(product => {
      const randomStock = Math.floor(Math.random() * 200) + 20; // Random stock between 20-220
      return {
        id: `inv-${product.id}`,
        productId: product.id,
        quantityInStock: randomStock,
        quantityReserved: 0,
        quantityAvailable: randomStock,
        lowStockThreshold: 10,
        reorderPoint: 5,
        reorderQuantity: 50,
        lastCounted: now,
        lastRestocked: now,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.insert(inventoryTable).values(inventoryRecords);

    return NextResponse.json({
      message: "Products and inventory seeded successfully",
      inserted: productsToInsert.length,
      products: productsToInsert.map(p => ({ id: p.id, name: p.name, sku: p.sku })),
    });
  } catch (error) {
    console.error("Error seeding inventory:", error);
    return NextResponse.json(
      { 
        error: "Failed to seed inventory",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}, "canManageInventory");

export async function POST(_request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return handler(_request);
}
