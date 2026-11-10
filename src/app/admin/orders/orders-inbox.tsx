"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Bell, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/orders/money";
import { formatLocalPhone } from "@/lib/orders/phone";
import { PAYMENT_STATUS_LABELS, STATUS_LABELS } from "@/lib/orders/status";
import type { OrderStatus, PaymentStatus } from "@/lib/orders/status";
import { Button } from "@/ui/primitives/button";

import { fetchOrders } from "./actions";

export type InboxRow = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerPhoneE164: string | null;
  fulfilment: string;
  deliveryArea: string | null;
  pickupLocationName: string | null;
  total: number;
  deliveryFeeConfirmed: boolean;
  channel: string;
  attentionReason: string | null;
  assignedToName: string | null;
  createdAt: string;
  itemCount: number;
};

type TabInfo = { key: string; label: string; count: number };

const EMPTY: Record<string, string> = {
  needs_action: "Nothing needs your attention right now.",
  active: "No orders in progress.",
  delivered_unpaid: "No delivered orders waiting for payment.",
  done: "No completed orders yet.",
  closed: "No cancelled or expired orders.",
  all: "No orders yet.",
};

const ORDER_NUMBER_RE = /^wb-?\d{4}-?\d+$/i;

function statusTone(status: string): string {
  switch (status) {
    case "awaiting_customer":
    case "received":
    case "delivery_failed":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
    case "confirmed":
    case "preparing":
    case "ready_for_pickup":
    case "out_for_delivery":
      return "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200";
    case "delivered":
    case "picked_up":
    case "completed":
      return "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function paymentTone(p: string): string {
  switch (p) {
    case "pending_verification":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
    case "paid":
      return "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200";
    case "refund_due":
      return "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function relativeTime(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function attentionLabel(reason: string): string {
  if (reason === "payment_to_verify") return "Payment to verify";
  if (reason === "stuck") return "Stuck";
  return reason;
}

export function OrdersInbox({
  tab,
  q,
  tabs,
  initialRows,
  initialCursor,
}: {
  tab: string;
  q: string;
  tabs: TabInfo[];
  initialRows: InboxRow[];
  initialCursor: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState(q);
  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState(initialCursor);
  const [seen, setSeen] = useState(initialRows);
  const [loading, startLoad] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("unsupported");

  // Server data changed (tab/search/refresh) → reset the list.
  if (seen !== initialRows) {
    setSeen(initialRows);
    setRows(initialRows);
    setCursor(initialCursor);
  }

  useEffect(() => {
    setInput(q);
  }, [q]);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPerm(Notification.permission);
  }, []);

  // Tick relative times.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh while the tab is visible.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);

  // New-order alert.
  const needsAction = tabs.find((t) => t.key === "needs_action")?.count ?? 0;
  const prevNeeds = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevNeeds.current;
    prevNeeds.current = needsAction;
    if (prev !== null && needsAction > prev) {
      toast("New order", { description: `${needsAction} need${needsAction === 1 ? "s" : ""} action` });
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification("New order", { body: `${needsAction} order${needsAction === 1 ? "" : "s"} need action` });
        } catch {
          // Some mobile browsers only allow notifications via service workers.
        }
      }
    }
  }, [needsAction]);

  // Pasted order number with one hit → open it.
  useEffect(() => {
    if (q && ORDER_NUMBER_RE.test(q) && initialRows.length === 1 && !initialCursor) {
      router.push(`/admin/orders/${initialRows[0].id}`);
    }
  }, [q, initialRows, initialCursor, router]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    router.replace(v ? `/admin/orders?q=${encodeURIComponent(v)}` : `/admin/orders?tab=${tab}`);
  }

  function changeTab(key: string) {
    setInput("");
    router.replace(`/admin/orders?tab=${key}`);
  }

  function loadMore() {
    if (!cursor) return;
    startLoad(async () => {
      const res = await fetchOrders(tab, q, cursor);
      const more: InboxRow[] = res.rows.map((r) => ({
        ...r,
        total: Number(r.total),
        createdAt: r.createdAt.toISOString(),
      }));
      setRows((cur) => [...cur, ...more.filter((m) => !cur.some((c) => c.id === m.id))]);
      setCursor(res.nextCursor);
    });
  }

  async function enableAlerts() {
    if (typeof Notification === "undefined") return;
    setPerm(await Notification.requestPermission());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <form onSubmit={submitSearch} className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            inputMode="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Order number, phone or name"
            className="h-12 w-full rounded-lg border border-input bg-background pr-3 pl-10 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </form>
        {perm === "default" ? (
          <Button type="button" variant="outline" className="h-12 shrink-0" onClick={enableAlerts}>
            <Bell /> Enable alerts
          </Button>
        ) : null}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {tabs.map((t) => {
          const active = !q && t.key === tab;
          const hot = t.key === "needs_action" && t.count > 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => changeTab(t.key)}
              className={cn(
                "flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 text-center text-xs font-semibold",
                  hot ? "bg-red-600 text-white" : active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {q ? <p className="text-sm text-muted-foreground">Results for “{q}”</p> : null}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {q ? "No orders match your search." : EMPTY[tab] ?? "No orders."}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const status = r.status as OrderStatus;
            const pay = r.paymentStatus as PaymentStatus;
            return (
              <li key={r.id}>
                <Link
                  href={`/admin/orders/${r.id}`}
                  className="block rounded-xl border bg-card p-4 shadow-xs transition-colors active:bg-accent hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-sm font-semibold">{r.orderNumber}</span>
                    <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                      {relativeTime(r.createdAt, now)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium">{r.customerName}</p>
                      <p className="text-sm text-muted-foreground">{formatLocalPhone(r.customerPhoneE164)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold">
                        {formatMoney(r.total)}
                        {!r.deliveryFeeConfirmed ? <span className="text-xs font-normal text-muted-foreground"> + delivery</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.itemCount} item{r.itemCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.fulfilment === "pickup"
                      ? `Pickup${r.pickupLocationName ? ` · ${r.pickupLocationName}` : ""}`
                      : `Delivery${r.deliveryArea ? ` · ${r.deliveryArea}` : ""}`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-md px-2 py-1 text-xs font-medium", statusTone(r.status))}>
                      {STATUS_LABELS[status] ?? r.status}
                    </span>
                    <span className={cn("rounded-md px-2 py-1 text-xs font-medium", paymentTone(r.paymentStatus))}>
                      {PAYMENT_STATUS_LABELS[pay] ?? r.paymentStatus}
                    </span>
                    {r.attentionReason ? (
                      <span className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-900 dark:bg-red-500/20 dark:text-red-200">
                        {attentionLabel(r.attentionReason)}
                      </span>
                    ) : null}
                    {r.channel === "web_paystack_legacy" ? (
                      <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Legacy web order</span>
                    ) : null}
                    {r.assignedToName ? (
                      <span className="ml-auto text-xs text-muted-foreground">Handled by {r.assignedToName}</span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {cursor ? (
        <Button type="button" variant="outline" className="h-12 w-full" onClick={loadMore} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : null} Load more
        </Button>
      ) : null}
    </div>
  );
}
