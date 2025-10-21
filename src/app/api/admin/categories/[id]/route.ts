import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { categoryTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/admin/categories/[id] - Get category by ID
const getHandler = withAdminAuth(
  async (_request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const category = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.id, params.id),
      });

      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ category });
    } catch (error) {
      console.error("Error fetching category:", error);
      return NextResponse.json(
        { error: "Failed to fetch category" },
        { status: 500 }
      );
    }
  },
  "canManageCategories"
);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getHandler(request, { params: { id } });
}

// PUT /api/admin/categories/[id] - Update category
const putHandler = withAdminAuth(
  async (request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const body = await request.json();
      const { name, slug, description, image, isActive, sortOrder } = body;

      const existingCategory = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.id, params.id),
      });

      if (!existingCategory) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      const updatedCategory = {
        ...existingCategory,
        name: name || existingCategory.name,
        slug: slug || existingCategory.slug,
        description: description !== undefined ? description : existingCategory.description,
        image: image !== undefined ? image : existingCategory.image,
        isActive: isActive !== undefined ? isActive : existingCategory.isActive,
        sortOrder: sortOrder !== undefined ? sortOrder : existingCategory.sortOrder,
        updatedAt: new Date(),
      };

      await db.update(categoryTable)
        .set(updatedCategory)
        .where(eq(categoryTable.id, params.id));

      return NextResponse.json({ category: updatedCategory });
    } catch (error) {
      console.error("Error updating category:", error);
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 }
      );
    }
  },
  "canManageCategories"
);

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return putHandler(request, { params: { id } });
}

// DELETE /api/admin/categories/[id] - Delete category
const deleteHandler = withAdminAuth(
  async (_request: NextRequest, _adminUser, context?: { params: Record<string, string> }) => {
    try {
      const params = context?.params as { id: string };
      const existingCategory = await db.query.categoryTable.findFirst({
        where: eq(categoryTable.id, params.id),
      });

      if (!existingCategory) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 404 }
        );
      }

      await db.delete(categoryTable)
        .where(eq(categoryTable.id, params.id));

      return NextResponse.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      return NextResponse.json(
        { error: "Failed to delete category" },
        { status: 500 }
      );
    }
  },
  "canManageCategories"
);

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return deleteHandler(request, { params: { id } });
}
