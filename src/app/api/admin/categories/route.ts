import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { categoryTable, productTable } from "@/db/schema";
import { sql } from "drizzle-orm";
// (no additional operators needed)

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/admin/categories - Get all categories
const getHandler = withAdminAuth(
  async (request: NextRequest) => {
    try {
      // Check if this is for inventory filtering (only active categories)
      const url = new URL(request.url);
      const forInventory = url.searchParams.get('forInventory') === 'true';
      
      const categories = await db.query.categoryTable.findMany({
        where: forInventory ? (categories, { eq }) => eq(categories.isActive, true) : undefined,
        orderBy: (categories, { asc }) => [asc(categories.name)],
      });

      // product counts per category
      const counts = await db
        .select({
          categoryId: productTable.categoryId,
          count: sql<number>`count(*)`,
        })
        .from(productTable)
        .groupBy(productTable.categoryId);

      const categoryIdToCount = new Map<string, number>();
      for (const row of counts) {
        if (row.categoryId) categoryIdToCount.set(row.categoryId, Number(row.count));
      }

      const categoriesWithCounts = categories.map((c) => ({
        ...c,
        productCount: categoryIdToCount.get(c.id) ?? 0,
      }));

      return NextResponse.json({ categories: categoriesWithCounts });
    } catch (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }
  },
  "canManageCategories"
);

export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params; // satisfy Next.js typed route signature
  return getHandler(request);
}

// POST /api/admin/categories - Create new category
const postHandler = withAdminAuth(
  async (request: NextRequest, adminUser) => {
    try {
      const body = await request.json();
      const { name, slug, description, image, isActive } = body;

      if (!name) {
        return NextResponse.json(
          { error: "Name is required" },
          { status: 400 }
        );
      }

      // Generate slug if missing, ensure uniqueness
      const allExisting = await db.query.categoryTable.findMany();
      const existingSlugs = new Set(allExisting.map((c) => c.slug));
      const baseSlug = slug && String(slug).trim().length > 0 ? slugify(slug) : slugify(name);
      let uniqueSlug = baseSlug;
      let counter = 2;
      while (existingSlugs.has(uniqueSlug)) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      const newCategory = {
        id: `cat-${Date.now()}`,
        name,
        slug: uniqueSlug,
        description: description || "",
        image: Array.isArray(image) ? JSON.stringify(image) : (image || ""),
        isActive: isActive !== false,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: adminUser.id,
      };

      await db.insert(categoryTable).values(newCategory);

      return NextResponse.json({ category: newCategory }, { status: 201 });
    } catch (error) {
      console.error("Error creating category:", error);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }
  },
  "canManageCategories"
);

export async function POST(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params; // satisfy typed route signature
  return postHandler(request);
}
