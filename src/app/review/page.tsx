import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";

import { db } from "@/db";
import { productTable } from "@/db/schema";
import { getPublicSettings } from "@/lib/settings/get";
import { PageShell } from "@/ui/components/content-page";
import { ReviewForm } from "@/ui/components/review-form";

export const metadata: Metadata = {
  title: "Write a review",
  robots: { index: false, follow: true },
  alternates: { canonical: "/review" },
};

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const [{ order }, { brand }, products] = await Promise.all([
    searchParams,
    getPublicSettings(),
    db
      .select({ id: productTable.id, name: productTable.name })
      .from(productTable)
      .where(eq(productTable.isActive, true))
      .orderBy(asc(productTable.name)),
  ]);
  return (
    <PageShell
      title="Write a review"
      subtitle={<p className="text-lg">Thank you for taking a minute. It helps other tea lovers choose.</p>}
    >
      <div className="rounded-2xl border bg-card p-6 md:p-8">
        <ReviewForm products={products} orderNumber={order?.slice(0, 40)} brandName={brand.name} />
      </div>
    </PageShell>
  );
}
