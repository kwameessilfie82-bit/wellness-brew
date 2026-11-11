import { NextResponse } from "next/server";

import { adminHasPermission, getAuthenticatedAdmin } from "@/lib/admin-session";
import { DATASETS, type DatasetKey, isDatasetKey } from "@/lib/export/datasets";
import { type AnySheet, buildWorkbook } from "@/lib/export/xlsx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "all" = every dataset this admin may see (products are already inside inventory). */
const ALL_ORDER: DatasetKey[] = ["analytics", "orders", "customers", "inventory", "categories", "invoices"];

/**
 * GET /api/admin/export/{dataset}?days=30 → .xlsx download.
 * `days` limits time-based data (orders, invoices, stock movements, analytics);
 * omit it for everything. Each dataset is gated by the same permission as its page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const daysParam = Number(new URL(request.url).searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(Math.floor(daysParam), 3650) : null;

  let keys: DatasetKey[];
  if (dataset === "all") {
    keys = ALL_ORDER.filter((k) => adminHasPermission(admin, DATASETS[k].permission));
    if (keys.length === 0) return NextResponse.json({ error: "Nothing you can export" }, { status: 403 });
  } else if (isDatasetKey(dataset)) {
    if (!adminHasPermission(admin, DATASETS[dataset].permission)) {
      return NextResponse.json({ error: "You don't have access to this data" }, { status: 403 });
    }
    keys = [dataset];
  } else {
    return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  }

  try {
    const groups = await Promise.all(keys.map((k) => DATASETS[k].sheets({ days })));
    // In the combined workbook, prefix tabs so "Summary" etc. say where they came from.
    const sheets: AnySheet[] =
      keys.length === 1
        ? groups[0]
        : groups.flatMap((g, i) => (keys[i] === "analytics" ? g.map((s) => ({ ...s, name: `Analytics - ${s.name}` })) : g));
    const label = dataset === "all" ? "All data" : DATASETS[dataset as DatasetKey].label;
    const buffer = await buildWorkbook(sheets, `Wellness Brew ${label}`);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `wellness-brew-${dataset}${days ? `-last-${days}-days` : ""}-${stamp}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[export]", dataset, error);
    return NextResponse.json({ error: "Couldn't build the export. Please try again." }, { status: 500 });
  }
}
