"use client";

import {
  BarChart3,
  FileText,
  FolderOpen,
  type LucideIcon,
  Settings,
  ShoppingBag,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  ADMIN_DESTINATIONS,
  type AdminDestination,
  type AdminPermission,
  rankVisits,
  type VisitLog,
  visitStorageKey,
  type VisitTarget,
} from "@/lib/admin-nav";

const ICONS: Record<AdminDestination["icon"], LucideIcon> = {
  orders: ShoppingBag,
  catalog: Warehouse,
  categories: FolderOpen,
  customers: Users,
  invoices: FileText,
  analytics: BarChart3,
  settings: Settings,
};

const SLOTS = 6;
const noopSubscribe = () => () => {};

type Tile = { target: VisitTarget; count?: number; last?: number };

function ago(ts: number, now: number) {
  const m = Math.round((now - ts) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function QuickAccess({ userId, permissions }: { userId: string; permissions: AdminPermission[] }) {
  const allowed = new Set(permissions);
  const defaults: Tile[] = ADMIN_DESTINATIONS.filter((d) => allowed.has(d.permission)).map((target) => ({ target }));
  // Visit log lives in localStorage (client-only); the server snapshot is null so SSR renders the defaults.
  const raw = useSyncExternalStore(
    noopSubscribe,
    () => localStorage.getItem(visitStorageKey(userId)) ?? "{}",
    () => null,
  );
  const [now] = useState(() => Date.now());
  const ranked = useMemo(() => {
    if (raw === null) return [];
    try {
      return rankVisits(JSON.parse(raw) as VisitLog).filter((v) => allowed.has(v.target.permission as AdminPermission));
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, permissions]);
  const personal = ranked.length > 0;
  const tiles: Tile[] = personal
    ? (() => {
        const used = new Set(ranked.map((r) => r.target.key));
        return [...ranked.slice(0, SLOTS), ...defaults.filter((d) => !used.has(d.target.key))].slice(0, SLOTS);
      })()
    : defaults.slice(0, SLOTS);

  return (
    <section aria-labelledby="quick-access" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="quick-access" className="text-lg font-semibold">
          Quick access
        </h2>
        <p className="text-xs text-muted-foreground">{personal ? "Your most-used pages" : "Pages you open most will appear here"}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" data-testid="quick-access">
        {tiles.map(({ target, count, last }) => {
          const Icon = ICONS[target.icon] ?? Settings;
          return (
            <Link
              key={target.key}
              href={target.href}
              className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium leading-tight">{target.label}</span>
              <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                {count && last && now ? `Opened ${count}× · ${ago(last, now)}` : (target.description ?? "")}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
