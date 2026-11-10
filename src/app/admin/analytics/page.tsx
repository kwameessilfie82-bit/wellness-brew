import Link from "next/link";
import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { businessAnalytics, parseRange, RANGES } from "@/lib/analytics/server";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/orders/money";
import { formatLocalPhone } from "@/lib/orders/phone";
import { CANCEL_REASON_LABELS } from "@/lib/orders/status";
import { BarSeries } from "@/ui/components/admin/charts";
import { RankedBars, StatTile } from "@/ui/components/admin/stat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";

export const dynamic = "force-dynamic";

const RANGE_LABELS: Record<number, string> = { 7: "7 days", 30: "30 days", 90: "90 days", 365: "12 months" };
const PAYMENT_LABELS: Record<string, string> = {
  momo: "Mobile Money",
  bank: "Bank transfer",
  cash_on_delivery: "Cash on delivery",
  unknown: "Not chosen",
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const count = (v: number) => new Intl.NumberFormat().format(v);

function duration(mins: number | null) {
  if (mins === null) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = mins / 60;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} hr`;
  return `${(h / 24).toFixed(1)} days`;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const adminUser = await isAdmin();
  if (!adminUser) redirect("/auth/sign-in?redirect=/admin/analytics");
  if (adminUser.role?.permissions?.canViewAnalytics !== true) redirect("/auth/not-authorized");

  const days = parseRange((await searchParams).range);
  const a = await businessAnalytics(days);
  const f = a.funnel;
  const periodLabel = RANGE_LABELS[days];

  const funnelSteps = [
    { label: "Orders placed on the website", value: f.placed },
    { label: "Sent to you on WhatsApp", value: f.sent },
    { label: "Confirmed", value: f.confirmed },
    { label: "Delivered / picked up", value: f.handedOver },
    { label: "Completed (delivered & paid)", value: f.completed },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            How the business is doing over the last {periodLabel}, compared with the {periodLabel} before.
          </p>
        </div>
        <nav aria-label="Time range" className="inline-flex rounded-lg border bg-card p-1">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/analytics?range=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                r === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {RANGE_LABELS[r]}
            </Link>
          ))}
        </nav>
      </div>

      {/* Money */}
      <section aria-labelledby="sales-h" className="space-y-3">
        <h2 id="sales-h" className="text-lg font-semibold">
          Sales
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Revenue" value={formatMoney(a.current.revenue)} change={a.changes.revenue} hint={`was ${formatMoney(a.previous.revenue)}`} />
          <StatTile label="Sales" value={count(a.current.sales)} change={a.changes.sales} hint="invoices & confirmed orders" />
          <StatTile label="Average sale" value={formatMoney(a.current.aov)} change={a.changes.aov} />
          <StatTile label="Units sold" value={count(a.current.units)} change={a.changes.units} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Revenue {a.weekly ? "by week" : "by day"}</CardTitle>
            <CardDescription>Invoices created by hand plus WhatsApp orders once confirmed</CardDescription>
          </CardHeader>
          <CardContent>
            <BarSeries data={a.series} dataKey="revenue" kind="money" label="Revenue" weekly={a.weekly} />
          </CardContent>
        </Card>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Best sellers</CardTitle>
              <CardDescription>Top products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBars
                rows={a.topProducts.map((p) => ({ label: p.name, value: p.revenue, sub: `· ${p.units} sold` }))}
                format={formatMoney}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By category</CardTitle>
              <CardDescription>Where the revenue comes from</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBars
                rows={a.byCategory.map((c) => ({
                  label: c.name,
                  value: c.revenue,
                  sub: `· ${pct(c.revenue, a.current.revenue)}%`,
                }))}
                format={formatMoney}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Orders */}
      <section aria-labelledby="orders-h" className="space-y-3">
        <h2 id="orders-h" className="text-lg font-semibold">
          WhatsApp orders
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Orders placed" value={count(f.placed)} hint={`${f.delivery} delivery · ${f.pickup} pickup`} />
          <StatTile label="Confirmed" value={`${pct(f.confirmed, f.placed)}%`} hint={`${f.confirmed} of ${f.placed} orders`} />
          <StatTile label="Time to confirm" value={duration(f.confirmMins)} hint="median, order → confirmed" />
          <StatTile label="Time to deliver" value={duration(f.deliverMins)} hint="median, confirmed → handed over" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Order journey</CardTitle>
              <CardDescription>How many orders reach each step</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RankedBars
                rows={funnelSteps.map((s) => ({ label: s.label, value: s.value, sub: f.placed ? `· ${pct(s.value, f.placed)}%` : "" }))}
                format={count}
                empty="No orders in this period yet"
              />
              <p className="text-sm text-muted-foreground">
                Lost: {f.expired} never sent on WhatsApp (expired) · {f.cancelled} cancelled · {f.returned} returned
                {f.gifts ? ` · ${f.gifts} gift order${f.gifts === 1 ? "" : "s"}` : ""}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders {a.weekly ? "by week" : "by day"}</CardTitle>
              <CardDescription>Orders placed on the website</CardDescription>
            </CardHeader>
            <CardContent>
              <BarSeries data={a.series} dataKey="orders" kind="count" label="Orders" weekly={a.weekly} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Busiest days</CardTitle>
              <CardDescription>Orders by day of the week — plan stock and riders around these</CardDescription>
            </CardHeader>
            <CardContent>
              <BarSeries data={a.weekdays} dataKey="count" xKey="name" xIsDate={false} kind="count" label="Orders" height={200} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Where orders go</CardTitle>
              <CardDescription>Top delivery areas</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBars rows={a.areas.map((r) => ({ label: r.name, value: r.count }))} format={count} empty="No deliveries yet" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>How customers want to pay</CardTitle>
              <CardDescription>Choice made when ordering</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBars
                rows={a.payments.map((r) => ({ label: PAYMENT_LABELS[r.method] ?? r.method, value: r.count, sub: `· ${pct(r.count, f.placed)}%` }))}
                format={count}
                empty="No orders yet"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Why orders were cancelled</CardTitle>
              <CardDescription>Fix the top reason first</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBars
                rows={a.cancelReasons.map((r) => ({
                  label: CANCEL_REASON_LABELS[r.reason as keyof typeof CANCEL_REASON_LABELS] ?? r.reason,
                  value: r.count,
                }))}
                format={count}
                empty="No cancellations — nice."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Customers & stock */}
      <section aria-labelledby="cust-h" className="space-y-3">
        <h2 id="cust-h" className="text-lg font-semibold">
          Customers & stock
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Customers who bought" value={count(a.customers.buyers)} hint="by WhatsApp number" />
          <StatTile
            label="Returning customers"
            value={`${pct(a.customers.returning, a.customers.buyers)}%`}
            hint={`${a.customers.returning} returning · ${a.customers.newBuyers} new`}
          />
          <StatTile label="Stock value" value={formatMoney(a.stock.value)} hint={`${count(a.stock.units)} units at selling price`} />
          <StatTile
            label="Low / out of stock"
            value={String(a.lowStock.length)}
            hint="active products"
            href="/admin/inventory"
            tone={a.lowStock.some((p) => p.available <= 0) ? "attention" : "default"}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top customers</CardTitle>
              <CardDescription>By confirmed order value this period</CardDescription>
            </CardHeader>
            <CardContent>
              {a.topCustomers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No confirmed orders in this period yet</p>
              ) : (
                <ul className="divide-y">
                  {a.topCustomers.map((c) => (
                    <li key={c.phone} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatLocalPhone(c.phone)} · {c.orders} order{c.orders === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium tabular-nums">{formatMoney(c.spent)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Restock soon</CardTitle>
              <CardDescription>At or below each product&apos;s low-stock level</CardDescription>
            </CardHeader>
            <CardContent>
              <RankedBars
                rows={a.lowStock.map((p) => ({
                  label: p.name,
                  value: Math.max(0, p.available),
                  sub: p.available <= 0 ? "· out" : `· alert at ${p.threshold}`,
                }))}
                format={(v) => `${v} left`}
                empty="Everything is well stocked."
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
