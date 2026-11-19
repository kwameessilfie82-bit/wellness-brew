import { and, count, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { inquiryTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { cn } from "@/lib/cn";
import { whatsappLink } from "@/lib/settings/schemas";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

import { InquiryControls } from "./inquiry-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries" };

const PAGE_SIZE = 50;
const KINDS = ["all", "gifting", "stockist", "general"] as const;
const STATUSES = ["open", "all", "new", "contacted", "quoted", "won", "lost"] as const;
const OPEN = ["new", "contacted", "quoted"];

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requirePagePermission("canManageOrders", "/admin/inquiries");
  const kind = KINDS.find((k) => k === sp.kind) ?? "all";
  const status = STATUSES.find((s) => s === sp.status) ?? "open";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const kindWhere = kind === "all" ? undefined : eq(inquiryTable.kind, kind);
  const statusWhere =
    status === "all" ? undefined : status === "open" ? inArray(inquiryTable.status, OPEN) : eq(inquiryTable.status, status);

  const [counts, rows] = await Promise.all([
    db
      .select({ status: inquiryTable.status, n: count() })
      .from(inquiryTable)
      .where(kindWhere)
      .groupBy(inquiryTable.status),
    db
      .select()
      .from(inquiryTable)
      .where(and(kindWhere, statusWhere))
      .orderBy(desc(inquiryTable.createdAt))
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const countOf = (s: (typeof STATUSES)[number]) =>
    s === "all"
      ? counts.reduce((a, c) => a + c.n, 0)
      : s === "open"
        ? counts.filter((c) => OPEN.includes(c.status)).reduce((a, c) => a + c.n, 0)
        : (counts.find((c) => c.status === s)?.n ?? 0);
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);
  const href = (k: string, s: string, p = 1) => `/admin/inquiries?kind=${k}&status=${s}${p > 1 ? `&page=${p}` : ""}`;
  const pill = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-sm capitalize",
      active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
    );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Inquiries"
        description="Gifting, stockist and general enquiries from the website."
      />
      <nav className="flex flex-wrap gap-2" aria-label="Inquiry kind">
        {KINDS.map((k) => (
          <Link key={k} href={href(k, status)} className={pill(k === kind)}>
            {k}
          </Link>
        ))}
      </nav>
      <nav className="flex flex-wrap gap-2" aria-label="Inquiry status">
        {STATUSES.map((s) => (
          <Link key={s} href={href(kind, s)} className={pill(s === status)}>
            {s} ({countOf(s)})
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No inquiries match.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((q) => {
            const details = Object.entries(q.details ?? {}).filter(([, v]) => v);
            return (
              <li key={q.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium capitalize">{q.kind}</span>
                  <span className="font-medium">{q.name}</span>
                  {q.company ? <span className="text-muted-foreground">{q.company}</span> : null}
                  <span className="rounded border px-1.5 py-0.5 text-xs capitalize">{q.status}</span>
                  <span className="text-muted-foreground">
                    {q.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {q.source ? <span className="text-xs text-muted-foreground">via {q.source}</span> : null}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {q.phone ? (
                    <>
                      <a className="underline" href={`tel:${q.phone}`}>
                        {q.phone}
                      </a>
                      <a className="underline" href={whatsappLink(q.phone)} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    </>
                  ) : null}
                  {q.email ? (
                    <a className="underline" href={`mailto:${q.email}`}>
                      {q.email}
                    </a>
                  ) : null}
                </div>
                {q.message ? <p className="whitespace-pre-line text-sm">{q.message}</p> : null}
                {details.length > 0 ? (
                  <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                    {details.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-muted-foreground capitalize">{k.replace(/[_-]/g, " ")}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                <InquiryControls id={q.id} status={q.status} staffNotes={q.staffNotes} />
              </li>
            );
          })}
        </ul>
      )}

      {page > 1 || hasNext ? (
        <div className="flex justify-between text-sm">
          {page > 1 ? <Link href={href(kind, status, page - 1)}>← Newer</Link> : <span />}
          {hasNext ? <Link href={href(kind, status, page + 1)}>Older →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
