"use client";

import { AlertTriangle, Package, PackageCheck, PackageX } from "lucide-react";

import { cn } from "@/lib/cn";

type Stats = {
  totalProducts: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
};

export function InventoryStatsBar({ initialStats }: { initialStats: Stats }) {
  const stats = initialStats;

  const cards = [
    {
      label: "Total products",
      value: stats.totalProducts,
      icon: Package,
      tone: "default" as const,
    },
    {
      label: "In stock",
      value: stats.inStockItems,
      icon: PackageCheck,
      tone: "success" as const,
    },
    {
      label: "Low stock",
      value: stats.lowStockItems,
      icon: AlertTriangle,
      tone: "warning" as const,
    },
    {
      label: "Out of stock",
      value: stats.outOfStockItems,
      icon: PackageX,
      tone: "danger" as const,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "admin-stat-card",
            card.tone === "success" && "admin-stat-card--success",
            card.tone === "warning" && "admin-stat-card--warning",
            card.tone === "danger" && "admin-stat-card--danger",
          )}
        >
          <card.icon className="h-5 w-5 shrink-0 opacity-80" />
          <div>
            <p className="text-2xl font-bold tabular-nums">{card.value}</p>
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
