import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { categoryTable } from "@/db/schema";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const curatedCategories: Array<{
  name: string;
  description?: string;
  sortOrder?: number;
}> = [
  { name: "Tin (25)", description: "Tea products in 25-count tins", sortOrder: 0 },
  { name: "Tin (20)", description: "Tea products in 20-count tins", sortOrder: 1 },
  { name: "Paper Tubes", description: "Tea products in paper tubes", sortOrder: 2 },
  { name: "Paper Packs", description: "Tea products in paper packs", sortOrder: 3 },
  { name: "Gift Boxes", description: "Tea products in gift boxes", sortOrder: 4 },
];

const handler = withAdminAuth(async (_request: NextRequest, adminUser) => {
  try {
    const now = new Date();

    // Build list with slugs
    const toInsert = curatedCategories.map((c, index) => ({
      name: c.name.trim(),
      slug: slugify(c.name),
      description: c.description ?? "",
      sortOrder: index,
    }));

    // Fetch existing categories by name or slug in a single query
    const existing = await db.query.categoryTable.findMany();
    const existingNames = new Set(existing.map((c) => c.name.toLowerCase()));
    const existingSlugs = new Set(existing.map((c) => c.slug));

    const newRows = toInsert
      .filter((c) => !existingNames.has(c.name.toLowerCase()) && !existingSlugs.has(c.slug))
      .map((c) => ({
        id: `cat-${c.slug}`,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: "",
        isActive: true,
        sortOrder: c.sortOrder ?? 0,
        createdAt: now,
        updatedAt: now,
        createdBy: adminUser.id,
      }));

    if (newRows.length > 0) {
      await db.insert(categoryTable).values(newRows);
    }

    return NextResponse.json({
      inserted: newRows.length,
      skipped: toInsert.length - newRows.length,
      totalAfter: existing.length + newRows.length,
      categories: newRows,
    });
  } catch (error) {
    console.error("Error seeding categories:", error);
    return NextResponse.json({ error: "Failed to seed categories" }, { status: 500 });
  }
}, "canManageCategories");

export async function POST(_request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return handler(_request);
}


