import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/db";
import { activityLogTable, adminUserTable, userTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { ACTIVITY_MODULES } from "@/lib/activity";
import { cn } from "@/lib/cn";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

const PAGE_SIZE = 50;
type ModuleKey = keyof typeof ACTIVITY_MODULES;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; page?: string }>;
}) {
  const sp = await searchParams;
  await requirePagePermission("canViewAnalytics", "/admin/activity");
  const moduleKey = sp.module && sp.module in ACTIVITY_MODULES ? (sp.module as ModuleKey) : null;
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const rows = await db
    .select({
      id: activityLogTable.id,
      module: activityLogTable.module,
      action: activityLogTable.action,
      summary: activityLogTable.summary,
      createdAt: activityLogTable.createdAt,
      actorName: userTable.name,
      actorEmail: userTable.email,
    })
    .from(activityLogTable)
    .leftJoin(adminUserTable, eq(adminUserTable.id, activityLogTable.actorId))
    .leftJoin(userTable, eq(userTable.id, adminUserTable.userId))
    .where(moduleKey ? eq(activityLogTable.module, moduleKey) : undefined)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  const hasNext = rows.length > PAGE_SIZE;
  const visible = rows.slice(0, PAGE_SIZE);
  const href = (m: string | null, p = 1) => {
    const q = new URLSearchParams();
    if (m) q.set("module", m);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };
  const pill = (active: boolean) =>
    cn("rounded-full border px-3 py-1 text-sm", active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Activity" description="Who changed what, newest first.">
        <Link href="/admin/settings" className="text-sm underline">
          Settings changes are listed in Settings → History
        </Link>
      </AdminPageHeader>
      <nav className="flex flex-wrap gap-2" aria-label="Module">
        <Link href={href(null)} className={pill(moduleKey === null)}>
          All
        </Link>
        {(Object.entries(ACTIVITY_MODULES) as [ModuleKey, string][]).map(([key, label]) => (
          <Link key={key} href={href(key)} className={pill(key === moduleKey)}>
            {label}
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No activity yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Who</th>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">What</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {r.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-3 py-2">{r.actorName ?? r.actorEmail ?? "Unknown"}</td>
                  <td className="px-3 py-2">
                    {ACTIVITY_MODULES[r.module as ModuleKey] ?? r.module}
                  </td>
                  <td className="px-3 py-2">{r.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {page > 1 || hasNext ? (
        <div className="flex justify-between text-sm">
          {page > 1 ? <Link href={href(moduleKey, page - 1)}>← Newer</Link> : <span />}
          {hasNext ? <Link href={href(moduleKey, page + 1)}>Older →</Link> : null}
        </div>
      ) : null}
    </div>
  );
}
