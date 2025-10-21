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
  { name: "Prescriptions", description: "Prescription-only medicines and repeats" },
  { name: "Medicines", description: "General medicines for common conditions" },
  { name: "Vitamins", description: "Essential vitamins and minerals" },
  { name: "Supplements", description: "Dietary and nutritional supplements" },
  { name: "Medical Devices", description: "Home health and diagnostic devices" },
  { name: "Mother & Baby", description: "Maternity and baby care essentials" },
  { name: "Toiletries", description: "Everyday personal care products" },
  { name: "Cold, Cough & Flu", description: "Relief for cold, cough and flu" },
  { name: "First Aid", description: "First aid supplies and wound care" },
  { name: "Allergy & Hayfever", description: "Allergy relief and antihistamines" },
  { name: "Eye Care", description: "Eye health and contact lens care" },
  { name: "Baby Medicine", description: "Medicines formulated for babies" },
  { name: "Dental Care", description: "Oral hygiene and dental health" },
  { name: "Foot Care", description: "Foot health and orthotic care" },
  { name: "Digestion & Stomach", description: "Digestive health and antacids" },
  { name: "Feminine Care", description: "Women's health and intimate care" },
  { name: "Pain Relief", description: "Analgesics and pain management" },
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


