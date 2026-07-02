import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable } from "@/db/schema";

/**
 * Products for the invoice generator — the single source of truth is the
 * product table, so renames/price edits in Inventory flow straight through.
 * Tier prices fall back to the base price when a tier hasn't been set.
 */
function firstImage(imagesJson: string | null): string {
  if (!imagesJson) return "/placeholder.svg";
  try {
    const arr = JSON.parse(imagesJson);
    const first = Array.isArray(arr) ? arr[0] : null;
    // Never ship inline base64 in the catalog payload — it bloats the response
    // and slows first load. Those images live in Blob after migration.
    if (typeof first === "string" && first && !first.startsWith("data:")) {
      return first;
    }
  } catch {
    /* ignore */
  }
  return "/placeholder.svg";
}

const num = (v: string | null): number | null =>
  v == null || v === "" ? null : Number(v);

const getHandler = withAdminAuth(async () => {
  try {
    const rows = await db
      .select({
        id: productTable.id,
        name: productTable.name,
        description: productTable.description,
        images: productTable.images,
        price: productTable.price,
        customerPrice: productTable.customerPrice,
        retailPrice: productTable.retailPrice,
        wholesalePrice: productTable.wholesalePrice,
        wholesalePrice2: productTable.wholesalePrice2,
        distributorPrice: productTable.distributorPrice,
      })
      .from(productTable)
      .where(eq(productTable.isActive, true))
      .orderBy(asc(productTable.name));

    const products = rows.map((r) => {
      const base = num(r.price) ?? 0;
      const customer = num(r.customerPrice) ?? base;
      return {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        customerPrice: customer,
        retailPrice: num(r.retailPrice) ?? customer,
        wholesalePrice: num(r.wholesalePrice) ?? customer,
        wholesalePrice2: num(r.wholesalePrice2) ?? customer,
        distributorPrice: num(r.distributorPrice) ?? customer,
        image: firstImage(r.images),
      };
    });

    return NextResponse.json(
      { products },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error fetching invoice products:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice products" },
      { status: 500 },
    );
  }
}, ["canManageInventory", "canManageProducts"]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return getHandler(request);
}
