import { and, asc, count, desc, eq, isNotNull, notInArray, sum } from "drizzle-orm";

import { db } from "@/db";
import { productTable, promoCodeTable, storeOrderTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { parsePrice } from "@/lib/format";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

import { PromotionsClient, type PromoRow } from "./promotions-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  await requirePagePermission("canManageSettings", "/admin/promotions");
  const [codes, stats, products] = await Promise.all([
    db.select().from(promoCodeTable).orderBy(desc(promoCodeTable.createdAt)).limit(500),
    // Orders and revenue per code (cancelled orders excluded).
    db
      .select({
        code: storeOrderTable.promoCode,
        orders: count(),
        revenue: sum(storeOrderTable.total),
        discount: sum(storeOrderTable.discount),
      })
      .from(storeOrderTable)
      .where(and(isNotNull(storeOrderTable.promoCode), notInArray(storeOrderTable.status, ["cancelled", "expired"])))
      .groupBy(storeOrderTable.promoCode),
    db
      .select({ id: productTable.id, name: productTable.name })
      .from(productTable)
      .where(eq(productTable.isActive, true))
      .orderBy(asc(productTable.name)),
  ]);
  const byCode = new Map(stats.map((s) => [s.code, s]));
  const rows: PromoRow[] = codes.map((c) => {
    const s = byCode.get(c.code);
    return {
      id: c.id,
      code: c.code,
      kind: c.kind as PromoRow["kind"],
      discountType: c.discountType as PromoRow["discountType"],
      value: parsePrice(c.value),
      minSubtotal: parsePrice(c.minSubtotal),
      bundleProductIds: Array.isArray(c.bundleProductIds) ? c.bundleProductIds : [],
      startsOn: c.startsAt ? c.startsAt.toISOString().slice(0, 10) : "",
      endsOn: c.endsAt ? c.endsAt.toISOString().slice(0, 10) : "",
      maxUses: c.maxUses,
      uses: c.uses,
      referrerName: c.referrerName ?? "",
      referrerPhone: c.referrerPhone ?? "",
      note: c.note ?? "",
      isActive: c.isActive,
      orders: Number(s?.orders ?? 0),
      revenue: parsePrice(s?.revenue ?? "0"),
      discountGiven: parsePrice(s?.discount ?? "0"),
    };
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promotions"
        description="Discount codes, referral codes (with a shareable link) and bundle deals. Customers enter codes at checkout."
      />
      <PromotionsClient rows={rows} products={products} />
    </div>
  );
}
