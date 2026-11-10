import { AlertTriangle, ArrowRight, BarChart3, PackageOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import type { AdminPermission } from "@/lib/admin-nav";
import { isAdmin } from "@/lib/admin-auth";
import { dashboardSnapshot, lowStockItems, recentOrders } from "@/lib/analytics/server";
import { cn } from "@/lib/cn";
import { parsePrice } from "@/lib/format";
import { formatMoney } from "@/lib/orders/money";
import { orderTabCounts } from "@/lib/orders/server/staff-queries";
import { isOrderStatus, isPaymentStatus, PAYMENT_STATUS_LABELS, STATUS_LABELS } from "@/lib/orders/status";
import { paymentTone, relativeTime, statusTone } from "@/lib/orders/ui";
import { BarSeries } from "@/ui/components/admin/charts";
import { StatTile } from "@/ui/components/admin/stat";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";

import { DeniedToast } from "./_dashboard/denied-toast";
import { QuickAccess } from "./_dashboard/quick-access";

export const dynamic = "force-dynamic";

function greeting(now: Date) {
  const h = now.getUTCHours(); // Ghana = UTC
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const adminUser = await isAdmin();
  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin");
  }

  const perms = adminUser.role?.permissions ?? {};
  // Everyone with an admin-area role sees the dashboard; money is manager-only
  // (canViewAnalytics), so the revenue queries only run for them.
  if (!Object.values(perms).some((v) => v === true)) {
    redirect("/auth/not-authorized");
  }
  const canViewAnalytics = perms.canViewAnalytics === true;

  const [snap, counts, recent, low] = await Promise.all([
    canViewAnalytics ? dashboardSnapshot() : Promise.resolve(null),
    orderTabCounts(),
    recentOrders(8),
    lowStockItems(6),
  ]);

  const permissions = (Object.keys(perms) as AdminPermission[]).filter((k) => perms[k as keyof typeof perms] === true);
  const now = new Date();
  const firstName = adminUser.user?.name?.split(/\s+/)[0] ?? "";

  return (
    <div className="space-y-8">
      {denied ? <DeniedToast denied={denied} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {greeting(now)}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {now.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "UTC",
            })}{" "}
            · here&apos;s what needs you today.
          </p>
        </div>
        {canViewAnalytics ? (
          <Button asChild variant="outline">
            <Link href="/admin/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Full analytics
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Headline numbers */}
      {snap ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            label="Orders needing action"
            value={String(counts.needs_action)}
            hint={snap.ordersToday ? `${snap.ordersToday} new today` : "No new orders today"}
            href="/admin/orders?tab=needs_action"
            tone={counts.needs_action > 0 ? "attention" : "default"}
          />
          <StatTile
            label="Sales today"
            value={formatMoney(snap.today.revenue)}
            hint={`${snap.today.sales} sale${snap.today.sales === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Last 7 days"
            value={formatMoney(snap.thisWeek.revenue)}
            change={snap.weekChange}
            hint="vs the 7 days before"
            href="/admin/analytics?range=7"
          />
          <StatTile
            label="Owed to you"
            value={formatMoney(snap.owed)}
            hint={`${snap.owedCount} delivered, not fully paid`}
            href="/admin/orders?tab=delivered_unpaid"
            tone={snap.owed > 0 ? "attention" : "default"}
          />
          <StatTile
            label="Low / out of stock"
            value={`${snap.lowStock} / ${snap.outOfStock}`}
            hint="active products"
            href="/admin/inventory"
            tone={snap.outOfStock > 0 ? "attention" : "default"}
          />
        </div>
      ) : (
        // Operations view: order counts only, no money.
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile
            label="Needs action"
            value={String(counts.needs_action)}
            hint="To confirm or check"
            href="/admin/orders?tab=needs_action"
            tone={counts.needs_action > 0 ? "attention" : "default"}
          />
          <StatTile
            label="In progress"
            value={String(counts.active)}
            hint="Confirmed, preparing or out for delivery"
            href="/admin/orders?tab=active"
          />
          <StatTile
            label="Delivered, awaiting payment"
            value={String(counts.delivered_unpaid)}
            hint="Handed over, not yet closed"
            href="/admin/orders?tab=delivered_unpaid"
          />
        </div>
      )}

      {snap && (snap.toVerify > 0 || snap.refundDue > 0) ? (
        <div className="flex flex-wrap gap-2">
          {snap.toVerify > 0 ? (
            <Link
              href="/admin/orders?tab=needs_action"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
            >
              <AlertTriangle className="h-4 w-4" />
              {snap.toVerify} payment{snap.toVerify === 1 ? "" : "s"} to verify
            </Link>
          ) : null}
          {snap.refundDue > 0 ? (
            <Link
              href="/admin/orders?tab=closed"
              className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-900 dark:bg-red-500/20 dark:text-red-200"
            >
              <AlertTriangle className="h-4 w-4" />
              {snap.refundDue} refund{snap.refundDue === 1 ? "" : "s"} due
            </Link>
          ) : null}
        </div>
      ) : null}

      <QuickAccess userId={adminUser.userId} permissions={permissions} />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Recent orders */}
        <Card className="xl:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>Recent orders</CardTitle>
              <CardDescription>Newest WhatsApp orders</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/orders?tab=all">
                All orders <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                No orders yet. They&apos;ll show up here as customers order.
              </p>
            ) : (
              <ul className="divide-y" data-testid="recent-orders">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/orders/${r.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3 transition-colors hover:bg-accent/40"
                    >
                      <span className="font-mono text-sm font-semibold">{r.orderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{r.customerName}</span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoney(parsePrice(r.total))}
                        {!r.deliveryFeeConfirmed ? <span className="text-xs text-muted-foreground"> +del.</span> : null}
                      </span>
                      <span className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", statusTone(r.status))}>
                          {isOrderStatus(r.status) ? STATUS_LABELS[r.status] : r.status}
                        </span>
                        <span
                          className={cn("rounded-md px-2 py-0.5 text-xs font-medium", paymentTone(r.paymentStatus))}
                        >
                          {isPaymentStatus(r.paymentStatus) ? PAYMENT_STATUS_LABELS[r.paymentStatus] : r.paymentStatus}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(r.createdAt.toISOString(), now.getTime())}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          {snap ? (
            <Card>
              <CardHeader>
                <CardTitle>Sales, last 14 days</CardTitle>
                <CardDescription>
                  {formatMoney(snap.series.reduce((s, d) => s + d.revenue, 0))} from invoices & confirmed orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarSeries data={snap.series} dataKey="revenue" kind="money" label="Sales" height={180} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle>Running low</CardTitle>
                <CardDescription>At or below the low-stock level</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/inventory">
                  Restock <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {low.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <PackageOpen className="h-4 w-4" /> Everything is well stocked.
                </p>
              ) : (
                <ul className="space-y-2">
                  {low.map((p) => (
                    <li key={p.productId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{p.name}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                          p.available <= 0
                            ? "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200"
                            : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
                        )}
                      >
                        {p.available <= 0 ? "Out of stock" : `${p.available} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
