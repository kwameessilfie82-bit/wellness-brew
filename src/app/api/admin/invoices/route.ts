import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";

import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { invoiceItemTable, invoiceTable, productTable } from "@/db/schema";

type IncomingItem = {
  productId?: string | null;
  name: string;
  priceType?: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

const dec = (n: unknown): string => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toFixed(2) : "0.00";
};

// POST /api/admin/invoices — persist a generated invoice so it feeds analytics.
const postHandler = withAdminAuth(async (request: NextRequest, adminUser) => {
  try {
    const body = await request.json();
    const items: IncomingItem[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Cannot save an invoice with no items" },
        { status: 400 },
      );
    }

    // Resolve each line's category from the live product (snapshot for analytics).
    const productIds = items
      .map((i) => i.productId)
      .filter((id): id is string => Boolean(id));
    const categoryByProduct = new Map<string, string>();
    if (productIds.length > 0) {
      const rows = await db
        .select({ id: productTable.id, categoryId: productTable.categoryId })
        .from(productTable)
        .where(inArray(productTable.id, productIds));
      for (const r of rows) categoryByProduct.set(r.id, r.categoryId);
    }

    const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();

    await db.transaction(async (tx) => {
      await tx.insert(invoiceTable).values({
        id: invoiceId,
        invoiceNumber: body.invoiceNumber ?? invoiceId,
        invoiceDate,
        clientName: body.client?.name ?? null,
        clientPhone: body.client?.phone ?? null,
        clientEmail: body.client?.email ?? null,
        clientAddress: body.client?.address ?? null,
        subtotal: dec(body.subtotal),
        taxRate: dec(body.taxRate),
        taxAmount: dec(body.taxAmount),
        discount: dec(body.discount),
        customDesignPrinting: dec(body.customDesignPrinting),
        deliveries: dec(body.deliveries),
        total: dec(body.total),
        createdBy: adminUser.id,
        createdAt: new Date(),
      });

      await tx.insert(invoiceItemTable).values(
        items.map((item, idx) => ({
          id: `ii-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          invoiceId,
          productId: item.productId ?? null,
          categoryId: item.productId
            ? (categoryByProduct.get(item.productId) ?? null)
            : null,
          productName: item.name,
          priceType: item.priceType ?? "customer",
          unitPrice: dec(item.unitPrice),
          quantity: Math.max(0, Math.trunc(Number(item.quantity) || 0)),
          lineTotal: dec(item.lineTotal),
        })),
      );
    });

    return NextResponse.json(
      { message: "Invoice saved", id: invoiceId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error saving invoice:", error);
    return NextResponse.json(
      { error: "Failed to save invoice" },
      { status: 500 },
    );
  }
}, ["canManageInventory", "canManageProducts"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, never>> },
) {
  await context.params;
  return postHandler(request);
}
