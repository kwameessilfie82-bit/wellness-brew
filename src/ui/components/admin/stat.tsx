import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";

/** Headline number with an optional change-vs-previous chip. */
export function StatTile({
  label,
  value,
  hint,
  change,
  href,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  href?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-xl border bg-card p-4 transition-colors",
        href && "hover:border-primary/40 hover:bg-accent/40",
        tone === "attention" && "border-amber-400/60 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10",
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</span>
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {change !== undefined ? <ChangeChip value={change} /> : null}
        {hint ? <span>{hint}</span> : null}
      </span>
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function ChangeChip({ value }: { value: number | null }) {
  if (value === null) return <span className="rounded bg-muted px-1.5 py-0.5 font-medium">New</span>;
  const rounded = Math.round(value);
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium",
        rounded > 0 && "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200",
        rounded < 0 && "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
        rounded === 0 && "bg-muted",
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {rounded > 0 ? "+" : ""}
      {rounded}%
    </span>
  );
}

/** Ranked horizontal bars in plain HTML: label, value, bar length = share of the max. */
export function RankedBars({
  rows,
  format,
  empty = "Nothing in this period yet",
}: {
  rows: { label: string; value: number; sub?: string }[];
  format: (v: number) => string;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {format(r.value)}
              {r.sub ? <span className="ml-1 font-normal text-muted-foreground">{r.sub}</span> : null}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-[var(--chart-1)]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
