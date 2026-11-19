"use client";

import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/cn";
import {
  ALL_METRIC_KEYS,
  CHANNELS,
  computeRate,
  INPUT_METRICS,
  metricKey,
  metricLabel,
  RATE_METRICS,
  type ChannelKey,
  type InputMetricKey,
} from "@/lib/kpis/config";
import type { AbRow, AutoWeek, KpiWeeks } from "@/lib/kpis/server";
import { formatMoney } from "@/lib/orders/money";
import { StatTile } from "@/ui/components/admin/stat";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

import { saveKpiWeek } from "./actions";

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 600 },
  itemStyle: { color: "var(--popover-foreground)" },
} as const;

const num = (v: number) => new Intl.NumberFormat().format(v);
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const pctText = (r: number | null) => (r === null ? "" : `${(r * 100).toFixed(1)}%`);
const change = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / prev) * 100);

const MIN_AB_VIEWS = 100;

export function KpisClient({
  week,
  prevWeek,
  nextWeek,
  weeks,
  manual,
  auto,
  ab,
}: {
  week: string;
  prevWeek: string;
  nextWeek: string | null;
  weeks: string[];
  manual: KpiWeeks;
  auto: Record<string, AutoWeek>;
  ab: AbRow[];
}) {
  const router = useRouter();
  const [metric, setMetric] = useState("instagram.reach");

  const cur = auto[week];
  const prev = auto[prevWeek];

  const cards: { label: string; value: string; cur: number; prev: number; hint?: string }[] = [
    { label: "Orders placed", value: num(cur.orders), cur: cur.orders, prev: prev.orders },
    { label: "Revenue (confirmed)", value: formatMoney(cur.revenue), cur: cur.revenue, prev: prev.revenue },
    { label: "Repeat orders", value: num(cur.repeatOrders), cur: cur.repeatOrders, prev: prev.repeatOrders },
    { label: "WhatsApp clicks", value: num(cur.whatsapp_click), cur: cur.whatsapp_click, prev: prev.whatsapp_click },
    { label: "Product views", value: num(cur.view_item), cur: cur.view_item, prev: prev.view_item },
    { label: "Added to cart", value: num(cur.add_to_cart), cur: cur.add_to_cart, prev: prev.add_to_cart },
    { label: "Checkouts started", value: num(cur.begin_checkout), cur: cur.begin_checkout, prev: prev.begin_checkout },
    { label: "Leads", value: num(cur.generate_lead), cur: cur.generate_lead, prev: prev.generate_lead },
    { label: "Reviews sent", value: num(cur.review_submitted), cur: cur.review_submitted, prev: prev.review_submitted },
  ];

  const autoSeries = useMemo(
    () => weeks.map((w) => ({ week: w, revenue: auto[w]?.revenue ?? 0, orders: auto[w]?.orders ?? 0, clicks: auto[w]?.whatsapp_click ?? 0 })),
    [weeks, auto],
  );
  const manualSeries = useMemo(() => weeks.map((w) => ({ week: w, value: manual[w]?.[metric] ?? null })), [weeks, manual, metric]);

  const abRows = ["A", "B"].map((v) => {
    const r = ab.find((x) => x.variant === v);
    return { variant: v, views: r?.views ?? 0, clicks: r?.clicks ?? 0 };
  });
  const abShort = abRows.some((r) => r.views < MIN_AB_VIEWS);

  const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: "var(--muted-foreground)" } as const;

  return (
    <>
      {/* Week picker */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon" aria-label="Previous week">
          <Link href={`/admin/kpis?week=${prevWeek}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-44 text-center">
          <p className="text-sm font-semibold">Week of {longDate(week)}</p>
          <p className="text-xs text-muted-foreground">Monday to Sunday</p>
        </div>
        {nextWeek ? (
          <Button asChild variant="outline" size="icon" aria-label="Next week">
            <Link href={`/admin/kpis?week=${nextWeek}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" aria-label="Next week" disabled>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        <Input
          type="date"
          aria-label="Jump to a week"
          className="w-40"
          value={week}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => e.target.value && router.push(`/admin/kpis?week=${e.target.value}`)}
        />
      </div>

      <WeekGrid key={week} week={week} saved={manual[week] ?? {}} />

      {/* Automatic */}
      <section aria-labelledby="auto-h" className="space-y-3">
        <div>
          <h2 id="auto-h" className="text-lg font-semibold">
            From the website (automatic)
          </h2>
          <p className="text-sm text-muted-foreground">Changes are compared with the week before.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <StatTile key={c.label} label={c.label} value={c.value} change={change(c.cur, c.prev)} hint={`was ${c.label === "Revenue (confirmed)" ? formatMoney(c.prev) : num(c.prev)}`} />
          ))}
        </div>
      </section>

      {/* Trends */}
      <section aria-labelledby="trend-h" className="space-y-3">
        <h2 id="trend-h" className="text-lg font-semibold">
          Last 12 weeks
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>Confirmed website orders, GHS</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={autoSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                    <XAxis dataKey="week" tickFormatter={shortDate} minTickGap={16} tickMargin={8} {...axis} />
                    <YAxis width={44} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} {...axis} />
                    <Tooltip {...tooltipStyle} labelFormatter={(v) => `Week of ${shortDate(String(v))}`} formatter={(v) => [formatMoney(Number(v)), "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Orders and WhatsApp clicks</CardTitle>
              <CardDescription>Are clicks turning into orders?</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={autoSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%">
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                    <XAxis dataKey="week" tickFormatter={shortDate} minTickGap={16} tickMargin={8} {...axis} />
                    <YAxis width={40} allowDecimals={false} {...axis} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.5 }} labelFormatter={(v) => `Week of ${shortDate(String(v))}`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="orders" name="Orders" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                    <Bar dataKey="clicks" name="WhatsApp clicks" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{metricLabel(metric)}</CardTitle>
                <CardDescription>From the numbers you type in above. Gaps mean nothing was entered.</CardDescription>
              </div>
              <NativeSelect aria-label="Metric to chart" value={metric} onChange={(e) => setMetric(e.target.value)}>
                {CHANNELS.map((c) => (
                  <optgroup key={c.key} label={c.label}>
                    {ALL_METRIC_KEYS.filter((k) => k.startsWith(`${c.key}.`)).map((k) => (
                      <NativeSelectOption key={k} value={k}>
                        {metricLabel(k)}
                      </NativeSelectOption>
                    ))}
                  </optgroup>
                ))}
              </NativeSelect>
            </CardHeader>
            <CardContent>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={manualSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
                    <XAxis dataKey="week" tickFormatter={shortDate} minTickGap={16} tickMargin={8} {...axis} />
                    <YAxis width={44} {...axis} />
                    <Tooltip {...tooltipStyle} labelFormatter={(v) => `Week of ${shortDate(String(v))}`} formatter={(v) => [num(Number(v)), metricLabel(metric)]} />
                    <Line type="monotone" dataKey="value" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* A/B */}
      <section aria-labelledby="ab-h" className="space-y-3">
        <div>
          <h2 id="ab-h" className="text-lg font-semibold">
            A/B test: homepage headline
          </h2>
          <p className="text-sm text-muted-foreground">Last 12 weeks. Click rate is how many visitors pressed the main button.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Version</th>
                <th className="p-3 text-right font-medium">Views</th>
                <th className="p-3 text-right font-medium">Clicks</th>
                <th className="p-3 text-right font-medium">Click rate</th>
              </tr>
            </thead>
            <tbody>
              {abRows.map((r) => (
                <tr key={r.variant} className="border-b last:border-0">
                  <td className="p-3 font-medium">Headline {r.variant}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.views)}</td>
                  <td className="p-3 text-right tabular-nums">{num(r.clicks)}</td>
                  <td className="p-3 text-right tabular-nums">{r.views ? `${((r.clicks / r.views) * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {abShort ? (
          <p className="text-sm text-muted-foreground">
            Not enough data yet. Wait for at least {MIN_AB_VIEWS} views on each headline before picking a winner.
          </p>
        ) : null}
      </section>
    </>
  );
}

function WeekGrid({ week, saved }: { week: string; saved: Record<string, number> }) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const initial = useMemo(() => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(saved)) o[k] = String(v);
    return o;
  }, [saved]);
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const dirty = ALL_METRIC_KEYS.some((k) => (vals[k] ?? "") !== (initial[k] ?? ""));

  const read = (c: ChannelKey, m: InputMetricKey) => {
    const s = (vals[metricKey(c, m)] ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const save = () =>
    startSave(async () => {
      const payload: Record<string, number | null> = {};
      for (const k of ALL_METRIC_KEYS) {
        const s = (vals[k] ?? "").trim();
        const n = s === "" ? null : Number(s);
        if (n !== null && (!Number.isFinite(n) || n < 0)) {
          toast.error(`${metricLabel(k)} must be a number, 0 or more`);
          return;
        }
        // Only send what changed: new/edited values and cleared cells.
        if ((vals[k] ?? "") !== (initial[k] ?? "")) payload[k] = n;
      }
      const res = await saveKpiWeek(week, payload);
      if (res.ok) {
        toast.success("Saved");
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <section aria-labelledby="grid-h" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="grid-h" className="text-lg font-semibold">
            Numbers you type in
          </h2>
          <p className="text-sm text-muted-foreground">Enter 0 only when the real result is 0. Leave unknown numbers blank.</p>
        </div>
        <Button onClick={save} loading={saving} disabled={!dirty}>
          <Save className="mr-1 h-4 w-4" /> Save week
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="sticky left-0 bg-card p-2 font-medium">Channel</th>
              {INPUT_METRICS.map((m) => (
                <th key={m.key} className="p-2 font-medium">
                  {m.label}
                </th>
              ))}
              {RATE_METRICS.map((r) => (
                <th key={r.key} className="bg-muted/40 p-2 font-medium">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHANNELS.map((c) => (
              <tr key={c.key} className="border-b last:border-0">
                <th scope="row" className="sticky left-0 bg-card p-2 text-left font-medium">
                  {c.label}
                </th>
                {INPUT_METRICS.map((m) => {
                  const k = metricKey(c.key, m.key);
                  return (
                    <td key={m.key} className="p-1">
                      <Input
                        inputMode="decimal"
                        aria-label={`${c.label} ${m.label}`}
                        className={cn("h-8 w-24 px-2 text-right tabular-nums", (vals[k] ?? "") !== (initial[k] ?? "") && "border-primary")}
                        value={vals[k] ?? ""}
                        onChange={(e) => setVals((s) => ({ ...s, [k]: e.target.value }))}
                      />
                    </td>
                  );
                })}
                {RATE_METRICS.map((r) => (
                  <td key={r.key} className="bg-muted/40 p-2 text-right tabular-nums text-muted-foreground">
                    {pctText(computeRate(read(c.key, r.num), read(c.key, r.den))) || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
