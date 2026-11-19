import { requirePagePermission } from "@/lib/admin-auth";
import { addWeeks, isWeekStart, weekRange, weekStart } from "@/lib/kpis/config";
import { getAbResults, getAutoMetrics, getKpiWeeks } from "@/lib/kpis/server";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

import { KpisClient } from "./kpis-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "KPIs" };

const TREND_WEEKS = 12;

export default async function KpisPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requirePagePermission("canViewAnalytics", "/admin/kpis");
  const current = weekStart();
  const requested = (await searchParams).week;
  // Any date snaps to its Monday; future weeks are not allowed.
  const snapped = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? weekStart(requested) : current;
  const week = isWeekStart(snapped) && snapped <= current ? snapped : current;

  const weeks = weekRange(week, TREND_WEEKS);
  const [manual, auto, ab] = await Promise.all([
    getKpiWeeks(weeks[0], week),
    getAutoMetrics(weeks[0], week),
    getAbResults(weeks[0], week),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="KPI tracker"
        description="Type in the weekly numbers from Instagram, Facebook, LinkedIn and WhatsApp. Website numbers fill in by themselves."
      />
      <KpisClient
        week={week}
        prevWeek={addWeeks(week, -1)}
        nextWeek={week < current ? addWeeks(week, 1) : null}
        weeks={weeks}
        manual={manual}
        auto={auto}
        ab={ab}
      />
    </div>
  );
}
