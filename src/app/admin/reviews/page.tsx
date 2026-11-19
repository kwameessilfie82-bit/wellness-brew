import { count, desc, eq } from "drizzle-orm";
import { Star } from "lucide-react";
import Link from "next/link";

import { db } from "@/db";
import { productTable, reviewTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { cn } from "@/lib/cn";
import { getSettings } from "@/lib/settings/get";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";
import { ClaimWarnings } from "@/ui/components/admin/claim-warnings";

import { ReviewActions } from "./reviews-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

const PAGE_SIZE = 50;
const STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requirePagePermission("canManageProducts", "/admin/reviews");
  const status: Status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : "pending";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const [counts, rows, claims] = await Promise.all([
    db.select({ status: reviewTable.status, n: count() }).from(reviewTable).groupBy(reviewTable.status),
    db
      .select({
        id: reviewTable.id,
        productName: productTable.name,
        rating: reviewTable.rating,
        name: reviewTable.name,
        location: reviewTable.location,
        title: reviewTable.title,
        body: reviewTable.body,
        consent: reviewTable.consent,
        isFeatured: reviewTable.isFeatured,
        orderNumber: reviewTable.orderNumber,
        createdAt: reviewTable.createdAt,
      })
      .from(reviewTable)
      .leftJoin(productTable, eq(productTable.id, reviewTable.productId))
      .where(eq(reviewTable.status, status))
      .orderBy(desc(reviewTable.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE),
    getSettings("claims"),
  ]);
  const countOf = (s: Status) => counts.find((c) => c.status === s)?.n ?? 0;
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);
  const href = (s: Status, p = 1) => `/admin/reviews?status=${s}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reviews"
        description="Approve reviews before they appear on product pages and the homepage."
      />
      <nav className="flex flex-wrap gap-2" aria-label="Review status">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={href(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm capitalize",
              s === status ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {s} ({countOf(s)})
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No {status} reviews.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((r) => (
            <li key={r.id} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{r.productName ?? "Whole shop"}</span>
                <span className="flex items-center text-amber-500" role="img" aria-label={`${r.rating} stars`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < r.rating ? "fill-current" : "opacity-30")} />
                  ))}
                </span>
                {r.isFeatured ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Featured</span>
                ) : null}
                <span className="text-muted-foreground">
                  {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <div>
                {r.title ? <p className="font-medium">{r.title}</p> : null}
                <p className="whitespace-pre-line text-sm">{r.body}</p>
                <ClaimWarnings text={`${r.title ?? ""} ${r.body}`} bannedPhrases={claims.bannedPhrases} />
              </div>
              <p className="text-xs text-muted-foreground">
                {r.name}
                {r.location ? `, ${r.location}` : ""}
                {r.orderNumber ? ` · Order ${r.orderNumber}` : ""}
                {` · Consent ${r.consent ? "✓" : "✗"}`}
              </p>
              <ReviewActions id={r.id} status={status} isFeatured={r.isFeatured} />
            </li>
          ))}
        </ul>
      )}

      {page > 1 || hasNext ? (
        <div className="flex justify-between text-sm">
          {page > 1 ? <Link href={href(status, page - 1)}>← Newer</Link> : <span />}
          {hasNext ? <Link href={href(status, page + 1)}>Older →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
