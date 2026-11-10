"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatMoney } from "@/lib/orders/money";

type Point = Record<string, string | number>;

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
  cursor: { fill: "var(--muted)", opacity: 0.5 },
} as const;

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Single-series bar chart (one hue, recessive grid, hover tooltip).
 * `kind` decides axis/tooltip formatting.
 */
export function BarSeries({
  data,
  dataKey,
  xKey = "day",
  kind,
  label,
  height = 260,
  xIsDate = true,
  weekly = false,
}: {
  data: Point[];
  dataKey: string;
  xKey?: string;
  kind: "money" | "count";
  label: string;
  height?: number;
  xIsDate?: boolean;
  weekly?: boolean;
}) {
  const fmt = (v: number) => (kind === "money" ? formatMoney(v) : new Intl.NumberFormat().format(v));
  const axisFmt = (v: number) =>
    kind === "money" ? (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v))) : String(v);
  const empty = data.every((d) => Number(d[dataKey]) === 0);
  return (
    <div className="relative" style={{ height }}>
      {empty ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          Nothing in this period yet
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="12%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            fontSize={11}
            stroke="var(--muted-foreground)"
            tickFormatter={xIsDate ? (v: string) => shortDate(v) : undefined}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={40}
            fontSize={11}
            stroke="var(--muted-foreground)"
            allowDecimals={kind === "money"}
            tickFormatter={axisFmt}
          />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(v) => (xIsDate ? `${weekly ? "Week of " : ""}${shortDate(String(v))}` : String(v))}
            formatter={(v) => [fmt(Number(v)), label]}
          />
          <Bar dataKey={dataKey} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} minPointSize={0} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
