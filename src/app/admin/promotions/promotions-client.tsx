"use client";

import { Copy, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field, TextField, ToggleField } from "@/app/admin/settings/fields";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/orders/money";
import { describePromo, DISCOUNT_TYPES, PROMO_KINDS, type DiscountType, type PromoKind } from "@/lib/promotions/compute";
import { SITE_URL } from "@/lib/seo/site";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/ui/primitives/dialog";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

import { savePromo, setPromoActive } from "./actions";

export type PromoRow = {
  id: string;
  code: string;
  kind: PromoKind;
  discountType: DiscountType;
  value: number;
  minSubtotal: number;
  bundleProductIds: string[];
  startsOn: string;
  endsOn: string;
  maxUses: number | null;
  uses: number;
  referrerName: string;
  referrerPhone: string;
  note: string;
  isActive: boolean;
  orders: number;
  revenue: number;
  discountGiven: number;
};

type Draft = Omit<PromoRow, "id" | "uses" | "orders" | "revenue" | "discountGiven">;

const EMPTY: Draft = {
  code: "",
  kind: "discount",
  discountType: "percent",
  value: 10,
  minSubtotal: 0,
  bundleProductIds: [],
  startsOn: "",
  endsOn: "",
  maxUses: null,
  referrerName: "",
  referrerPhone: "",
  note: "",
  isActive: true,
};

const KIND_LABEL: Record<PromoKind, string> = { discount: "Discount", referral: "Referral", bundle: "Bundle" };

const referralLink = (code: string) => `${SITE_URL}/shop?ref=${encodeURIComponent(code)}`;

function copy(text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success("Copied"),
    () => toast.error("Couldn't copy"),
  );
}

export function PromotionsClient({ rows, products }: { rows: PromoRow[]; products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSave] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [toggleId, setToggleId] = useState<string | null>(null);

  const open = (row?: PromoRow) => {
    setErrors({});
    setEditing(row ? { id: row.id, draft: { ...row } } : { id: null, draft: { ...EMPTY } });
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [k]: v } } : e));

  const save = () => {
    if (!editing) return;
    startSave(async () => {
      const res = await savePromo(editing.id, editing.draft);
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

  const toggle = (row: PromoRow) => {
    setToggleId(row.id);
    startToggle(async () => {
      const res = await setPromoActive(row.id, !row.isActive);
      if (res.ok) router.refresh();
      else toast.error(res.error);
      setToggleId(null);
    });
  };

  const d = editing?.draft;
  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => open()}>
          <Plus className="mr-1 h-4 w-4" /> New code
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-6 text-center text-muted-foreground">No codes yet. Create your first one.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className={cn("space-y-3 rounded-xl border bg-card p-4", !r.isActive && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button type="button" className="font-mono text-lg font-bold" onClick={() => copy(r.code)} title="Copy code">
                    {r.code}
                  </button>
                  <p className="text-sm text-muted-foreground">{describePromo(r)}</p>
                </div>
                <Badge variant={r.isActive ? "default" : "secondary"}>{KIND_LABEL[r.kind]}</Badge>
              </div>
              {r.kind === "referral" && r.referrerName ? <p className="text-sm">For: {r.referrerName}</p> : null}
              {r.kind === "bundle" ? (
                <p className="text-sm text-muted-foreground">
                  {r.bundleProductIds.map((id) => products.find((p) => p.id === id)?.name ?? "Removed product").join(" + ")}
                </p>
              ) : null}
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Uses</dt>
                  <dd className="font-semibold">
                    {r.uses}
                    {r.maxUses ? ` / ${r.maxUses}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Orders</dt>
                  <dd className="font-semibold">{r.orders}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sales</dt>
                  <dd className="font-semibold">{formatMoney(r.revenue)}</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                {r.minSubtotal > 0 ? `Min. spend ${formatMoney(r.minSubtotal)} · ` : ""}
                {r.startsOn || r.endsOn ? `${r.startsOn || "now"} → ${r.endsOn || "no end"}` : "No end date"}
                {r.discountGiven > 0 ? ` · ${formatMoney(r.discountGiven)} given` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => open(r)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={toggling}
                  loading={toggling && toggleId === r.id}
                  onClick={() => toggle(r)}
                >
                  {r.isActive ? "Deactivate" : "Activate"}
                </Button>
                {r.kind === "referral" ? (
                  <Button size="sm" variant="ghost" onClick={() => copy(referralLink(r.code))}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Referral link
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && !saving && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit code" : "New code"}</DialogTitle>
          </DialogHeader>
          {d ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Code" value={d.code} onChange={(x) => set("code", x.toUpperCase())} error={errors.code} placeholder="WELCOME10" />
              <Field label="Type">
                <NativeSelect value={d.kind} onChange={(e) => set("kind", e.target.value as PromoKind)}>
                  {PROMO_KINDS.map((k) => (
                    <NativeSelectOption key={k} value={k}>
                      {KIND_LABEL[k]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Discount" error={errors.value}>
                <div className="flex gap-2">
                  <Input
                    inputMode="decimal"
                    value={Number.isFinite(d.value) ? d.value : ""}
                    onChange={(e) => set("value", Number(e.target.value))}
                  />
                  <NativeSelect value={d.discountType} onChange={(e) => set("discountType", e.target.value as DiscountType)}>
                    {DISCOUNT_TYPES.map((t) => (
                      <NativeSelectOption key={t} value={t}>
                        {t === "percent" ? "%" : "GHS"}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              </Field>
              <Field label="Minimum spend (GHS)" error={errors.minSubtotal}>
                <Input inputMode="decimal" value={d.minSubtotal} onChange={(e) => set("minSubtotal", Number(e.target.value) || 0)} />
              </Field>
              <Field label="Starts" error={errors.startsOn}>
                <Input type="date" value={d.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
              </Field>
              <Field label="Ends" error={errors.endsOn}>
                <Input type="date" value={d.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
              </Field>
              <Field label="Max uses (empty = unlimited)" error={errors.maxUses}>
                <Input
                  inputMode="numeric"
                  value={d.maxUses ?? ""}
                  onChange={(e) => set("maxUses", e.target.value.trim() ? Math.max(1, Math.floor(Number(e.target.value) || 1)) : null)}
                />
              </Field>
              <div className="flex items-end pb-2">
                <ToggleField label="Active" checked={d.isActive} onChange={(x) => set("isActive", x)} />
              </div>
              {d.kind === "referral" ? (
                <>
                  <TextField label="Referrer name" value={d.referrerName} onChange={(x) => set("referrerName", x)} error={errors.referrerName} />
                  <TextField label="Referrer phone" value={d.referrerPhone} onChange={(x) => set("referrerPhone", x)} error={errors.referrerPhone} />
                </>
              ) : null}
              {d.kind === "bundle" ? (
                <div className="sm:col-span-2">
                  <Field label="Bundle products (one of each must be in the cart)" error={errors.bundleProductIds}>
                    <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                      {products.map((p) => {
                        const on = d.bundleProductIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              set("bundleProductIds", on ? d.bundleProductIds.filter((x) => x !== p.id) : [...d.bundleProductIds, p.id])
                            }
                            className={cn(
                              "rounded-full border px-3 py-1 text-sm",
                              on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                            )}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <TextField label="Internal note" value={d.note} onChange={(x) => set("note", x)} error={errors.note} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
