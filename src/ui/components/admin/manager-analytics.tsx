"use client";

import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/primitives/card";

type SalesSeries = { day: string; units: number; revenue: number }[];
type TopProduct = { productId: string; name: string; categoryId: string | null; units: number; revenue: number };
type CategoryShare = { categoryId: string | null; categoryName: string | null; units: number; revenue: number };

interface SalesAnalyticsResponse {
  rangeDays: number;
  from: string;
  to: string;
  totals: { units: number; revenue: number };
  series: SalesSeries;
  topProducts: TopProduct[];
  byCategory: CategoryShare[];
}

const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function ManagerAnalytics() {
  const [data, setData] = useState<SalesAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/analytics/sales?range=90d&limit=10", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load analytics");
        const json = (await res.json()) as SalesAnalyticsResponse;
        if (mounted) setData(json);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load analytics";
        if (mounted) setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const series = data?.series ?? [];
  const topProducts = useMemo(() => data?.topProducts ?? [], [data?.topProducts]);
  const byCategory = data?.byCategory ?? [];

  // Derived value for radar: normalize units and revenue per product
  const radarData = useMemo(() => {
    if (!topProducts.length) return [] as { name: string; units: number; revenue: number }[];
    const maxUnits = Math.max(...topProducts.map((p) => p.units), 1);
    const maxRev = Math.max(...topProducts.map((p) => p.revenue), 1);
    return topProducts.map((p) => ({
      name: p.name,
      units: p.units / maxUnits,
      revenue: p.revenue / maxRev,
    }));
  }, [topProducts]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription className="text-destructive">{error || "Failed to load"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Area chart: Revenue over time */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
          <CardDescription>
            Daily revenue for the last {data.rangeDays} days
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} />
              <RechartsTooltip formatter={(v: number | string) => new Intl.NumberFormat().format(Number(v))} />
              <Area type="natural" dataKey="revenue" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
        <CardFooter>
          <div className="text-sm flex items-center gap-2">
            Total revenue {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(data.totals.revenue)}
            <TrendingUp className="h-4 w-4" />
          </div>
        </CardFooter>
      </Card>

      {/* Line chart: Units over time */}
      <Card>
        <CardHeader>
          <CardTitle>Units Sold</CardTitle>
          <CardDescription>Daily units sold</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="units" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar chart: Top products by revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products by Revenue</CardTitle>
          <CardDescription>Top {topProducts.length} products</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...topProducts].reverse()} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} />
              <RechartsTooltip formatter={(v: number | string) => new Intl.NumberFormat().format(Number(v))} />
              <Bar dataKey="revenue" fill="var(--chart-3)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pie chart: Revenue share by category */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Category</CardTitle>
          <CardDescription>Category contribution</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie dataKey="revenue" data={byCategory} nameKey="categoryName" outerRadius={100}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar chart: Normalized units vs revenue for top products */}
      <Card>
        <CardHeader>
          <CardTitle>Units vs Revenue (Normalized)</CardTitle>
          <CardDescription>Identify product efficiency</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <Radar name="Units" dataKey="units" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.3} />
              <Radar name="Revenue" dataKey="revenue" stroke="var(--chart-5)" fill="var(--chart-5)" fillOpacity={0.3} />
              <RechartsTooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radial chart: Total share from top product */}
      <Card>
        <CardHeader>
          <CardTitle>Top Product Contribution</CardTitle>
          <CardDescription>Share of revenue from top item</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="40%" outerRadius="100%" data={[{ name: "Top", value: topProducts[0]?.revenue || 0 }, { name: "Others", value: Math.max(0, (data.totals.revenue - (topProducts[0]?.revenue || 0))) }]}> 
              <RadialBar dataKey="value" fill="var(--chart-6)" />
              <RechartsTooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}


