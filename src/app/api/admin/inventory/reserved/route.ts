import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";

// GET /api/admin/inventory/reserved - Get only products with reserved quantities
const getHandler = withAdminAuth(
  async () => {
    try {
      // Get all products with their inventory
      const products = await db.query.productTable.findMany({
        columns: {
          id: true,
          name: true,
          description: true,
          price: true,
          images: true,
          sku: true,
        },
        with: {
          inventory: {
            columns: {
              quantityReserved: true,
              quantityInStock: true,
            }
          }
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
      });
      
      // Filter products that have reserved quantities > 0
      const reservedProducts = products.filter(product => {
        const reserved = product.inventory?.quantityReserved ?? 0;
        return reserved > 0;
      });

      return NextResponse.json({
        products: reservedProducts,
        totalCount: reservedProducts.length,
      });
    } catch (error) {
      console.error("Error fetching reserved products:", error);
      return NextResponse.json(
        { error: "Failed to fetch reserved products" },
        { status: 500 }
      );
    }
  },
  "canManageInventory"
);

export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return getHandler(request);
}
