import { asc } from "drizzle-orm";

import { db } from "@/db";
import { roadmapItemTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import type { RoadmapStatus } from "@/lib/roadmap/config";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

import { RoadmapClient, type RoadmapRow } from "./roadmap-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  await requirePagePermission("canViewAnalytics", "/admin/roadmap");
  const items = await db
    .select()
    .from(roadmapItemTable)
    .orderBy(asc(roadmapItemTable.position), asc(roadmapItemTable.createdAt), asc(roadmapItemTable.id))
    .limit(1000);

  const rows: RoadmapRow[] = items.map((i) => ({
    id: i.id,
    priority: i.priority ?? "",
    phase: i.phase ?? "",
    action: i.action,
    why: i.why ?? "",
    effort: i.effort ?? "",
    impact: i.impact ?? "",
    successMeasure: i.successMeasure ?? "",
    dependency: i.dependency ?? "",
    channel: i.channel ?? "",
    owner: i.owner ?? "",
    dueDate: i.dueDate ?? "",
    status: i.status as RoadmapStatus,
    notes: i.notes ?? "",
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader title="90-day roadmap" description="Every action, who owns it and when it is due. Change a status and it saves straight away." />
      <RoadmapClient rows={rows} today={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}
