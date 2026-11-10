"use client";

import { ArrowDown, ArrowUp, History, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  LOCATION_TYPES,
  SOCIAL_PLATFORMS,
  type SettingsMap,
  type SettingsSection,
} from "@/lib/settings/schemas";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Switch } from "@/ui/primitives/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs";
import { Textarea } from "@/ui/primitives/textarea";

import { revertSettingChange, saveSettings, type SettingHistoryEntry } from "./actions";

const SECTION_LABELS: Record<SettingsSection, string> = {
  brand: "Brand",
  contact: "Contact",
  locations: "Locations",
  social: "Social",
  payments: "Payments & invoices",
};

type Errors = Record<string, string>;

/* ───────────────────────── shared field helpers ───────────────────────── */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {multiline ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          rows={3}
        />
      ) : (
        <Input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
      )}
    </Field>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}

function ListControls({
  index,
  length,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label="Move up"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={index === length - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label="Move down"
      >
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => onRemove(index)}
        aria-label="Remove"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ───────────────────────── section state hook ───────────────────────── */

function useSection<K extends SettingsSection>(section: K, initial: SettingsMap[K]) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(value), [saved, value]);

  const set = <F extends keyof SettingsMap[K]>(field: F, v: SettingsMap[K][F]) =>
    setValue((prev) => ({ ...prev, [field]: v }));

  const save = () =>
    startTransition(async () => {
      const res = await saveSettings(section, value);
      if (res.ok) {
        setSaved(value);
        setErrors({});
        toast.success(`${SECTION_LABELS[section]} saved. Live on the site now.`);
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  const reset = () => {
    setValue(saved);
    setErrors({});
  };

  return { value, setValue, set, errors, save, reset, dirty, pending };
}

function SaveBar({
  dirty,
  pending,
  onSave,
  onReset,
}: {
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-6 flex items-center justify-end gap-2 border-t bg-card/95 px-6 py-3 backdrop-blur">
      {dirty && <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>}
      <Button type="button" variant="outline" disabled={!dirty || pending} onClick={onReset}>
        Discard
      </Button>
      <Button type="button" disabled={!dirty || pending} onClick={onSave}>
        <Save className="mr-2 h-4 w-4" />
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const grid = "grid gap-4 sm:grid-cols-2";

/* ───────────────────────── sections ───────────────────────── */

function BrandSection({ initial }: { initial: SettingsMap["brand"] }) {
  const s = useSection("brand", initial);
  const v = s.value;
  return (
    <SectionCard
      title="Brand"
      description="The name and wording customers see across the website, invoices and search results."
    >
      <div className={grid}>
        <TextField label="Brand name" value={v.name} onChange={(x) => s.set("name", x)} error={s.errors.name} />
        <TextField
          label="Legal / trading name"
          hint="Shown on invoices and legal pages if set."
          value={v.legalName}
          onChange={(x) => s.set("legalName", x)}
          error={s.errors.legalName}
        />
        <TextField label="Tagline" value={v.tagline} onChange={(x) => s.set("tagline", x)} error={s.errors.tagline} />
        <TextField
          label="Core promise"
          hint="One sentence on why customers choose you."
          value={v.promise}
          onChange={(x) => s.set("promise", x)}
          error={s.errors.promise}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Short description"
            hint="Used for search results and link previews."
            multiline
            value={v.description}
            onChange={(x) => s.set("description", x)}
            error={s.errors.description}
          />
        </div>
        <TextField
          label="Logo URL"
          hint="A /path in the site or a full https:// link."
          value={v.logoUrl}
          onChange={(x) => s.set("logoUrl", x)}
          error={s.errors.logoUrl}
        />
        <TextField
          label="Logo for dark backgrounds (optional)"
          value={v.logoDarkUrl}
          onChange={(x) => s.set("logoDarkUrl", x)}
          error={s.errors.logoDarkUrl}
        />
        <TextField
          label="Favicon URL (optional)"
          value={v.faviconUrl}
          onChange={(x) => s.set("faviconUrl", x)}
          error={s.errors.faviconUrl}
        />
        {v.logoUrl && (
          <div className="flex items-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.logoUrl} alt="Logo preview" className="h-16 w-16 rounded-md border object-contain" />
          </div>
        )}
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

function ContactSection({ initial }: { initial: SettingsMap["contact"] }) {
  const s = useSection("contact", initial);
  const v = s.value;
  return (
    <SectionCard
      title="Contact"
      description="One primary order number everywhere. These feed the contact page, footer, WhatsApp buttons and invoices."
    >
      <div className={grid}>
        <TextField
          label="Primary order number"
          hint="The single number customers should call to order."
          value={v.orderPhone}
          onChange={(x) => s.set("orderPhone", x)}
          error={s.errors.orderPhone}
          placeholder="+233 …"
        />
        <TextField
          label="WhatsApp number"
          hint="Used for every “Chat on WhatsApp” button. Leave empty to use the order number."
          value={v.whatsappNumber}
          onChange={(x) => s.set("whatsappNumber", x)}
          error={s.errors.whatsappNumber}
          placeholder="+233 …"
        />
        <TextField label="Orders email" type="email" value={v.emailOrders} onChange={(x) => s.set("emailOrders", x)} error={s.errors.emailOrders} />
        <TextField label="General email" type="email" value={v.emailHello} onChange={(x) => s.set("emailHello", x)} error={s.errors.emailHello} />
        <TextField label="Corporate / B2B email" type="email" value={v.emailB2B} onChange={(x) => s.set("emailB2B", x)} error={s.errors.emailB2B} />
        <TextField
          label="Business hours"
          placeholder="Mon–Sat, 8am–6pm"
          value={v.businessHours}
          onChange={(x) => s.set("businessHours", x)}
          error={s.errors.businessHours}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Response-time promise"
            placeholder="We reply on WhatsApp within 2 hours during business hours."
            value={v.responseTime}
            onChange={(x) => s.set("responseTime", x)}
            error={s.errors.responseTime}
          />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Other numbers</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              s.set("otherPhones", [...v.otherPhones, { id: crypto.randomUUID(), label: "", number: "" }])
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Add number
          </Button>
        </div>
        {v.otherPhones.length === 0 && (
          <p className="text-sm text-muted-foreground">No other numbers. Customers only see the primary number.</p>
        )}
        {v.otherPhones.map((p, i) => (
          <div key={p.id} className="flex flex-wrap items-start gap-2">
            <Input
              className="w-40"
              placeholder="Purpose (e.g. Corporate)"
              value={p.label}
              onChange={(e) =>
                s.set("otherPhones", v.otherPhones.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <div className="min-w-48 flex-1">
              <Input
                placeholder="+233 …"
                value={p.number}
                aria-invalid={!!s.errors[`otherPhones.${i}.number`]}
                onChange={(e) =>
                  s.set("otherPhones", v.otherPhones.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)))
                }
              />
              {s.errors[`otherPhones.${i}.number`] && (
                <p className="text-xs text-destructive">{s.errors[`otherPhones.${i}.number`]}</p>
              )}
            </div>
            <ListControls
              index={i}
              length={v.otherPhones.length}
              onMove={(a, b) => s.set("otherPhones", move(v.otherPhones, a, b))}
              onRemove={(j) => s.set("otherPhones", v.otherPhones.filter((_, k) => k !== j))}
            />
          </div>
        ))}
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

const LOCATION_TYPE_LABELS: Record<(typeof LOCATION_TYPES)[number], string> = {
  pickup: "Pickup point",
  correspondence: "Correspondence address",
  retail: "Retail / stockist",
  event: "Event / pop-up",
};

function LocationsSection({ initial }: { initial: SettingsMap["locations"] }) {
  const s = useSection("locations", initial);
  const items = s.value.items;
  const setItems = (next: typeof items) => s.set("items", next);
  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`items.${i}.${f}`];

  return (
    <SectionCard
      title="Locations"
      description="Addresses shown on the contact page and footer. Say clearly whether each is a pickup point or only a correspondence address."
    >
      <div className="space-y-4">
        {items.map((loc, i) => (
          <div key={loc.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <ToggleField label="Show on website" checked={loc.isPublic} onChange={(x) => update(i, { isPublic: x })} />
              <ListControls
                index={i}
                length={items.length}
                onMove={(a, b) => setItems(move(items, a, b))}
                onRemove={(j) => setItems(items.filter((_, k) => k !== j))}
              />
            </div>
            <div className={grid}>
              <TextField label="Name" value={loc.name} onChange={(x) => update(i, { name: x })} error={err(i, "name")} />
              <Field label="Type">
                <NativeSelect
                  value={loc.type}
                  onChange={(e) => update(i, { type: e.target.value as (typeof LOCATION_TYPES)[number] })}
                >
                  {LOCATION_TYPES.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {LOCATION_TYPE_LABELS[t]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <div className="sm:col-span-2">
                <TextField label="Address" value={loc.address} onChange={(x) => update(i, { address: x })} error={err(i, "address")} />
              </div>
              <TextField
                label="Google Maps link"
                value={loc.mapUrl}
                onChange={(x) => update(i, { mapUrl: x })}
                error={err(i, "mapUrl")}
                placeholder="https://maps.app.goo.gl/…"
              />
              <TextField label="Hours" value={loc.hours} onChange={(x) => update(i, { hours: x })} error={err(i, "hours")} />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setItems([
              ...items,
              { id: crypto.randomUUID(), name: "", address: "", type: "pickup", mapUrl: "", hours: "", isPublic: true },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add location
        </Button>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

const PLATFORM_LABELS: Record<(typeof SOCIAL_PLATFORMS)[number], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  youtube: "YouTube",
  whatsapp: "WhatsApp channel",
  other: "Other",
};

function SocialSection({ initial }: { initial: SettingsMap["social"] }) {
  const s = useSection("social", initial);
  const items = s.value.items;
  const setItems = (next: typeof items) => s.set("items", next);
  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`items.${i}.${f}`];

  return (
    <SectionCard
      title="Social profiles"
      description="Shown in the footer and contact page, and listed for Google so it links your profiles to the site. The order here is the order on the site."
    >
      <div className="space-y-4">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No profiles yet.</p>}
        {items.map((p, i) => (
          <div key={p.id} className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-4">
                <ToggleField label="Footer" checked={p.showInFooter} onChange={(x) => update(i, { showInFooter: x })} />
                <ToggleField label="Header" checked={p.showInHeader} onChange={(x) => update(i, { showInHeader: x })} />
              </div>
              <ListControls
                index={i}
                length={items.length}
                onMove={(a, b) => setItems(move(items, a, b))}
                onRemove={(j) => setItems(items.filter((_, k) => k !== j))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Platform">
                <NativeSelect
                  value={p.platform}
                  onChange={(e) => update(i, { platform: e.target.value as (typeof SOCIAL_PLATFORMS)[number] })}
                >
                  {SOCIAL_PLATFORMS.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {PLATFORM_LABELS[t]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <TextField label="Handle" placeholder="@wellnessbrew" value={p.handle} onChange={(x) => update(i, { handle: x })} error={err(i, "handle")} />
              <TextField label="Profile URL" placeholder="https://…" value={p.url} onChange={(x) => update(i, { url: x })} error={err(i, "url")} />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setItems([
              ...items,
              { id: crypto.randomUUID(), platform: "instagram", handle: "", url: "", showInFooter: true, showInHeader: false },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add profile
        </Button>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

function PaymentsSection({ initial }: { initial: SettingsMap["payments"] }) {
  const s = useSection("payments", initial);
  const v = s.value;
  const t = (label: string, field: keyof typeof v, extra?: { hint?: string; multiline?: boolean }) => (
    <TextField
      label={label}
      value={v[field]}
      onChange={(x) => s.set(field, x)}
      error={s.errors[field]}
      {...extra}
    />
  );
  return (
    <SectionCard
      title="Payments & invoices"
      description="Pre-filled on every new invoice in the invoice generator. Visible to managers only."
    >
      <h3 className="mb-3 text-sm font-semibold">Mobile Money</h3>
      <div className={grid}>
        {t("Provider", "momoProvider")}
        {t("Merchant ID", "momoMerchantId")}
        {t("Merchant name", "momoMerchantName")}
        {t("Payment reference", "momoReference")}
        {t("Contact line", "momoContactLine")}
      </div>
      <h3 className="mb-3 mt-6 text-sm font-semibold">Bank transfer</h3>
      <div className={grid}>
        {t("Bank name", "bankName")}
        {t("Branch", "bankBranch")}
        {t("Account name", "bankAccountName")}
        {t("Account number", "bankAccountNumber")}
      </div>
      <h3 className="mb-3 mt-6 text-sm font-semibold">Invoice</h3>
      <div className={grid}>
        {t("Invoice heading", "invoiceTitle")}
        {t("Cheques payable to", "chequesPayableTo")}
        {t("Address on invoice", "invoiceAddress")}
        {t("Tax ID / TIN", "invoiceTaxId")}
        <div className="sm:col-span-2">{t("Default note to customer", "invoiceNotes", { multiline: true })}</div>
        <div className="sm:col-span-2">{t("Late payment policy", "latePaymentPolicy", { multiline: true })}</div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── history ───────────────────────── */

function HistoryPanel({ history }: { history: SettingHistoryEntry[] }) {
  const [pending, startTransition] = useTransition();
  const revert = (id: string) =>
    startTransition(async () => {
      const res = await revertSettingChange(id);
      if (res.ok) {
        toast.success("Reverted. Reloading…");
        // Section forms hold their own state; reload so they pick up the reverted values.
        window.location.reload();
      } else toast.error(res.error);
    });

  return (
    <SectionCard title="Change history" description="Every settings change, newest first. Undo restores what was there before that change.">
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">No changes yet.</p>
      ) : (
        <ul className="divide-y">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                <span className="font-medium">
                  {SECTION_LABELS[h.key as SettingsSection] ?? h.key}
                </span>
                {h.isReset ? " reset to defaults" : " updated"}
                <span className="text-muted-foreground">
                  {" "}
                  · {h.changedByName ?? "Unknown"} · {new Date(h.changedAt).toLocaleString()}
                </span>
              </span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => revert(h.id)}>
                <RotateCcw className="mr-1 h-4 w-4" /> Undo this change
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ───────────────────────── page ───────────────────────── */

export function SettingsClient({
  initial,
  history,
}: {
  initial: SettingsMap;
  history: SettingHistoryEntry[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Business details used across the website and invoices. Changes go live as soon as you save.
        </p>
      </div>
      <Tabs defaultValue="brand">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {(Object.keys(SECTION_LABELS) as SettingsSection[]).map((k) => (
            <TabsTrigger key={k} value={k}>
              {SECTION_LABELS[k]}
            </TabsTrigger>
          ))}
          <TabsTrigger value="history">
            <History className="mr-1 h-4 w-4" /> History
          </TabsTrigger>
        </TabsList>
        {/* forceMount keeps unsaved edits when switching tabs */}
        <TabsContent value="brand" forceMount className="data-[state=inactive]:hidden">
          <BrandSection initial={initial.brand} />
        </TabsContent>
        <TabsContent value="contact" forceMount className="data-[state=inactive]:hidden">
          <ContactSection initial={initial.contact} />
        </TabsContent>
        <TabsContent value="locations" forceMount className="data-[state=inactive]:hidden">
          <LocationsSection initial={initial.locations} />
        </TabsContent>
        <TabsContent value="social" forceMount className="data-[state=inactive]:hidden">
          <SocialSection initial={initial.social} />
        </TabsContent>
        <TabsContent value="payments" forceMount className="data-[state=inactive]:hidden">
          <PaymentsSection initial={initial.payments} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryPanel history={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
