import { NextRequest, NextResponse } from "next/server";

import { withAdminAuth } from "@/lib/admin-middleware";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { categoryTable } from "@/db/schema";
import {
  fetchAllCategoriesWithCounts,
  fetchCategoriesForInventory,
} from "@/lib/queries/categories";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const getHandler = withAdminAuth(
  async (request: NextRequest) => {
    try {
      const forInventory =
        new URL(request.url).searchParams.get("forInventory") === "true";

      const categories = forInventory
        ? await fetchCategoriesForInventory()
        : await fetchAllCategoriesWithCounts();

      return NextResponse.json(
        { categories },
        {
          headers: forInventory
            ? {
                "Cache-Control":
                  "private, max-age=60, stale-while-revalidate=120",
              }
            : undefined,
        },
      );
    } catch (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }
  },
  ["canManageCategories", "canManageInventory"],
);

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return getHandler(request);
}

const postHandler = withAdminAuth(
  async (request: NextRequest, adminUser) => {
    try {
      const body = await request.json();
      const { name, slug, description, image, isActive } = body;

      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }

      const existingByName = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.name, name),
        columns: { id: true },
      });
      if (existingByName) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 409 },
        );
      }

      const allExisting = await db.query.categoryTable.findMany({
        columns: { slug: true },
      });
      const existingSlugs = new Set(allExisting.map((c) => c.slug));
      const baseSlug =
        slug && String(slug).trim().length > 0 ? slugify(slug) : slugify(name);
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
        image: Array.isArray(image) ? JSON.stringify(image) : image || "",
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
        { status: 500 },
      );
    }
  },
  "canManageCategories",
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return postHandler(request);
}
