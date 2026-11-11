"use client";

import { ChevronDown, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ui/primitives/dropdown-menu";

type Dataset = "analytics" | "inventory" | "products" | "categories" | "customers" | "orders" | "invoices" | "all";

const PERIODS: { label: string; days: number | null }[] = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
  { label: "All time", days: null },
];

async function download(dataset: Dataset, days: number | null) {
  const res = await fetch(`/api/admin/export/${dataset}${days ? `?days=${days}` : ""}`, { cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Export failed");
  }
  const blob = await res.blob();
  const name =
    /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `wellness-brew-${dataset}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * "Export to Excel" for an admin page. With `choosePeriod`, a menu asks how far
 * back to go (orders, invoices, everything); otherwise it downloads at once,
 * using `days` when the page already has a period (analytics).
 */
export function ExportButton({
  dataset,
  label = "Export to Excel",
  days = null,
  choosePeriod = false,
  variant = "outline",
}: {
  dataset: Dataset;
  label?: string;
  days?: number | null;
  choosePeriod?: boolean;
  variant?: "outline" | "default";
}) {
  const [busy, setBusy] = useState(false);

  const run = async (d: number | null) => {
    setBusy(true);
    try {
      await download(dataset, d);
      toast.success("Excel file downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  if (!choosePeriod) {
    return (
      <Button type="button" variant={variant} loading={busy} onClick={() => run(days)}>
        {busy ? null : <FileSpreadsheet className="mr-2 h-4 w-4" />}
        {busy ? "Preparing…" : label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} loading={busy} disabled={busy}>
          {busy ? null : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          {busy ? "Preparing…" : label}
          {busy ? null : <ChevronDown className="ml-1 h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>How far back?</DropdownMenuLabel>
        {PERIODS.map((p) => (
          <DropdownMenuItem key={p.label} onSelect={() => void run(p.days)}>
            {p.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
