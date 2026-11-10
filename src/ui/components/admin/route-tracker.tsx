"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { resolveVisit, type VisitLog, visitStorageKey } from "@/lib/admin-nav";

const MAX_ENTRIES = 40;

/** Records which admin pages this user opens, for the dashboard's quick access. Per device. */
export function RouteTracker({ userId }: { userId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    const target = resolveVisit(pathname ?? "", tab);
    if (!target) return;
    try {
      const key = visitStorageKey(userId);
      const log = JSON.parse(localStorage.getItem(key) ?? "{}") as VisitLog;
      const prev = log[target.key];
      log[target.key] = { target, count: (prev?.count ?? 0) + 1, last: Date.now() };
      const entries = Object.entries(log);
      if (entries.length > MAX_ENTRIES) {
        entries.sort((a, b) => b[1].last - a[1].last);
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries.slice(0, MAX_ENTRIES))));
      } else {
        localStorage.setItem(key, JSON.stringify(log));
      }
    } catch {
      // Storage blocked (private mode): quick access falls back to defaults.
    }
  }, [pathname, tab, userId]);

  return null;
}
