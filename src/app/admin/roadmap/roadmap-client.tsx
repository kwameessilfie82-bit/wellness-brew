"use client";

import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field, TextField } from "@/app/admin/settings/fields";
import { cn } from "@/lib/cn";
import {
  ROADMAP_IMPACTS,
  ROADMAP_PRIORITIES,
  ROADMAP_SIZES,
  ROADMAP_STATUS_LABELS,
  ROADMAP_STATUSES,
  type RoadmapStatus,
} from "@/lib/roadmap/config";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Progress } from "@/ui/primitives/progress";

import { deleteRoadmapItem, importStarterRoadmap, moveRoadmapItem, saveRoadmapItem, setRoadmapStatus } from "./actions";

export type RoadmapRow = {
  id: string;
  priority: string;
  phase: string;
  action: string;
  why: string;
  effort: string;
  impact: string;
  successMeasure: string;
  dependency: string;
  channel: string;
  owner: string;
  dueDate: string;
  status: RoadmapStatus;
  notes: string;
};

type Draft = Omit<RoadmapRow, "id">;

const EMPTY: Draft = {
  priority: "P1",
  phase: "",
  action: "",
  why: "",
  effort: "M",
  impact: "Medium",
  successMeasure: "",
  dependency: "",
  channel: "",
  owner: "",
  dueDate: "",
  status: "todo",
  notes: "",
};

const PRIORITY_TONE: Record<string, string> = {
  P0: "border-transparent bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
  P1: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
  P2: "border-transparent bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200",
  P3: "border-transparent bg-muted text-muted-foreground",
};

const fmtDate = (iso: string) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "No date";

export function RoadmapClient({ rows, today }: { rows: RoadmapRow[]; today: string }) {
  const router = useRouter();
  const [fStatus, setFStatus] = useState("");
  const [fOwner, setFOwner] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [importing, startImport] = useTransition();
  const [rowBusy, startRow] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyKind, setBusyKind] = useState<"status" | "move" | null>(null);

  const owners = useMemo(() => [...new Set(rows.map((r) => r.owner).filter(Boolean))].sort(), [rows]);
  const filtered = !!(fStatus || fOwner || fPriority);
  const visible = useMemo(
    () => rows.filter((r) => (!fStatus || r.status === fStatus) && (!fOwner || r.owner === fOwner) && (!fPriority || r.priority === fPriority)),
    [rows, fStatus, fOwner, fPriority],
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.status === "done").length;
    const byPriority = ROADMAP_PRIORITIES.map((p) => {
      const list = rows.filter((r) => r.priority === p);
      return { p, total: list.length, done: list.filter((r) => r.status === "done").length };
    }).filter((x) => x.total > 0);
    return { total, done, byPriority };
  }, [rows]);

  const groups = useMemo(() => {
    const map = new Map<string, RoadmapRow[]>();
    for (const r of visible) {
      const k = r.phase || "No phase";
      const list = map.get(k);
      if (list) list.push(r);
      else map.set(k, [r]);
    }
    return [...map.entries()];
  }, [visible]);

  const toggleOpen = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const changeStatus = (id: string, status: string) => {
    setBusyId(id);
    setBusyKind("status");
    startRow(async () => {
      const res = await setRoadmapStatus(id, status);
      if (res.ok) router.refresh();
      else toast.error(res.error);
      setBusyId(null);
    });
  };

  const move = (id: string, dir: "up" | "down") => {
    setBusyId(id);
    setBusyKind("move");
    startRow(async () => {
      const res = await moveRoadmapItem(id, dir);
      if (res.ok) router.refresh();
      else toast.error(res.error);
      setBusyId(null);
    });
  };

  const importAll = () =>
    startImport(async () => {
      const res = await importStarterRoadmap();
      if (res.ok) {
        toast.success(`Imported ${res.imported} actions`);
        router.refresh();
      } else toast.error(res.error);
    });

  const openEditor = (row?: RoadmapRow) => {
    setErrors({});
    setConfirmDelete(false);
    if (row) {
      const { id, ...draft } = row;
      setEditing({ id, draft });
    } else setEditing({ id: null, draft: { ...EMPTY } });
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));

  const save = () => {
    if (!editing) return;
    startSave(async () => {
      const res = await saveRoadmapItem(editing.id, editing.draft);
      if (res.ok) {
        toast.success("Saved");
        setEditing(null);
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  };

  const remove = () => {
    if (!editing?.id) return;
    const id = editing.id;
    startDelete(async () => {
      const res = await deleteRoadmapItem(id);
      if (res.ok) {
        toast.success("Deleted");
        setEditing(null);
        router.refresh();
      } else toast.error(res.error);
    });
  };

  if (rows.length === 0) {
    return (
      <>
        <div className="space-y-4 rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">The roadmap is empty. Start with the 30 actions from the digital audit, or add your own.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={importAll} loading={importing}>
              Import the 30 starter actions
            </Button>
            <Button variant="outline" disabled={importing} onClick={() => openEditor()}>
              <Plus className="mr-1 h-4 w-4" /> Add an action
            </Button>
          </div>
        </div>
        {editorDialog()}
      </>
    );
  }

  function editorDialog() {
    const d = editing?.draft;
    return (
      <Dialog open={!!editing} onOpenChange={(o) => !o && !saving && !deleting && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit action" : "New action"}</DialogTitle>
          </DialogHeader>
          {d ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextField label="Action" value={d.action} onChange={(x) => set("action", x)} error={errors.action} multiline rows={2} />
              </div>
              <Field label="Priority" error={errors.priority}>
                <NativeSelect value={d.priority} onChange={(e) => set("priority", e.target.value)}>
                  <NativeSelectOption value="">None</NativeSelectOption>
                  {ROADMAP_PRIORITIES.map((p) => (
                    <NativeSelectOption key={p} value={p}>
                      {p}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Status" error={errors.status}>
                <NativeSelect value={d.status} onChange={(e) => set("status", e.target.value as RoadmapStatus)}>
                  {ROADMAP_STATUSES.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {ROADMAP_STATUS_LABELS[s]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <TextField label="Phase" value={d.phase} onChange={(x) => set("phase", x)} error={errors.phase} placeholder="Week 2" />
              <TextField label="Workstream" value={d.channel} onChange={(x) => set("channel", x)} error={errors.channel} placeholder="Instagram" />
              <TextField label="Owner" value={d.owner} onChange={(x) => set("owner", x)} error={errors.owner} />
              <Field label="Due date" error={errors.dueDate}>
                <Input type="date" value={d.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
              </Field>
              <Field label="Effort" error={errors.effort}>
                <NativeSelect value={d.effort} onChange={(e) => set("effort", e.target.value)}>
                  <NativeSelectOption value="">None</NativeSelectOption>
                  {ROADMAP_SIZES.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {s}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Impact" error={errors.impact}>
                <NativeSelect value={d.impact} onChange={(e) => set("impact", e.target.value)}>
                  <NativeSelectOption value="">None</NativeSelectOption>
                  {ROADMAP_IMPACTS.map((s) => (
                    <NativeSelectOption key={s} value={s}>
                      {s}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <div className="sm:col-span-2">
                <TextField label="Why now" value={d.why} onChange={(x) => set("why", x)} error={errors.why} multiline rows={2} />
              </div>
              <TextField label="Success measure" value={d.successMeasure} onChange={(x) => set("successMeasure", x)} error={errors.successMeasure} />
              <TextField label="Dependency" value={d.dependency} onChange={(x) => set("dependency", x)} error={errors.dependency} />
              <div className="sm:col-span-2">
                <TextField label="Notes" value={d.notes} onChange={(x) => set("notes", x)} error={errors.notes} multiline rows={3} />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {editing?.id ? (
              confirmDelete ? (
                <Button variant="destructive" loading={deleting} disabled={saving} onClick={remove}>
                  Yes, delete it
                </Button>
              ) : (
                <Button variant="ghost" disabled={saving} onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" disabled={saving || deleting} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button loading={saving} disabled={deleting} onClick={save}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <>
      <section aria-label="Progress" className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">
            {stats.done} of {stats.total} done
          </h2>
          <span className="text-2xl font-bold tabular-nums">{pct}%</span>
        </div>
        <Progress value={pct} aria-label="Roadmap progress" />
        <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
          {stats.byPriority.map((x) => (
            <div key={x.p} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Badge className={PRIORITY_TONE[x.p]}>{x.p}</Badge>
                <span className="tabular-nums text-muted-foreground">
                  {x.done}/{x.total}
                </span>
              </div>
              <Progress value={x.total ? (x.done / x.total) * 100 : 0} className="h-1.5" />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Filter by status" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          {ROADMAP_STATUSES.map((s) => (
            <NativeSelectOption key={s} value={s}>
              {ROADMAP_STATUS_LABELS[s]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by owner" value={fOwner} onChange={(e) => setFOwner(e.target.value)}>
          <NativeSelectOption value="">All owners</NativeSelectOption>
          {owners.map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Filter by priority" value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
          <NativeSelectOption value="">All priorities</NativeSelectOption>
          {ROADMAP_PRIORITIES.map((p) => (
            <NativeSelectOption key={p} value={p}>
              {p}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {filtered ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFStatus("");
              setFOwner("");
              setFPriority("");
            }}
          >
            Clear filters
          </Button>
        ) : null}
        <div className="ml-auto">
          <Button onClick={() => openEditor()}>
            <Plus className="mr-1 h-4 w-4" /> New action
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-muted-foreground">Nothing matches these filters.</p>
      ) : (
        groups.map(([phase, list]) => (
          <section key={phase} aria-label={phase} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {phase} <span className="font-normal normal-case">· {list.filter((r) => r.status === "done").length}/{list.length} done</span>
            </h2>
            <ul className="divide-y rounded-xl border bg-card">
              {list.map((r, idx) => {
                const expanded = open.has(r.id);
                const overdue = !!r.dueDate && r.status !== "done" && r.dueDate < today;
                const busy = rowBusy && busyId === r.id;
                return (
                  <li key={r.id} className={cn("p-3", r.status === "done" && "bg-muted/30")}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={expanded ? "Hide details" : "Show details"}
                        onClick={() => toggleOpen(r.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      {r.priority ? <Badge className={PRIORITY_TONE[r.priority] ?? PRIORITY_TONE.P3}>{r.priority}</Badge> : null}
                      <div className="min-w-0 flex-1 basis-64">
                        <p className={cn("text-sm font-medium", r.status === "done" && "text-muted-foreground line-through")}>{r.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {[r.channel, r.owner].filter(Boolean).join(" · ") || "Unassigned"}
                          {r.effort || r.impact ? ` · effort ${r.effort || "—"} / impact ${r.impact || "—"}` : ""}
                        </p>
                      </div>
                      <span className={cn("text-xs tabular-nums", overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {overdue ? "Overdue · " : ""}
                        {fmtDate(r.dueDate)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <NativeSelect
                          size="sm"
                          aria-label={`Status of ${r.action}`}
                          value={r.status}
                          disabled={busy}
                          onChange={(e) => changeStatus(r.id, e.target.value)}
                        >
                          {ROADMAP_STATUSES.map((s) => (
                            <NativeSelectOption key={s} value={s}>
                              {ROADMAP_STATUS_LABELS[s]}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        {busy && busyKind === "status" ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Saving" /> : null}
                      </div>
                      <div className="flex items-center gap-1">
                        {!filtered ? (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Move up"
                              disabled={rowBusy || (idx === 0 && rows[0]?.id === r.id)}
                              loading={busy && busyKind === "move"}
                              onClick={() => move(r.id, "up")}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Move down"
                              disabled={rowBusy || rows[rows.length - 1]?.id === r.id}
                              onClick={() => move(r.id, "down")}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => openEditor(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {expanded ? (
                      <dl className="mt-3 grid gap-3 pl-7 text-sm sm:grid-cols-2">
                        <Detail label="Why now" value={r.why} />
                        <Detail label="Success measure" value={r.successMeasure} />
                        <Detail label="Dependency" value={r.dependency} />
                        <Detail label="Notes" value={r.notes} />
                      </dl>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      {editorDialog()}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}
