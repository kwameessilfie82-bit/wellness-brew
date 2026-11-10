"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { fillTemplate } from "@/lib/orders/message";
import {
  TEMPLATE_PLACEHOLDERS,
  WHATSAPP_TEMPLATE_INFO,
  WHATSAPP_TEMPLATE_KEYS,
} from "@/lib/settings/ordering-schemas";
import type { SettingsMap } from "@/lib/settings/schemas";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";

import {
  Field,
  ListControls,
  SaveBar,
  SectionCard,
  TextField,
  ToggleField,
  grid,
  move,
  useSection,
} from "./fields";

/** Number state helper: empty string → 0. */
const toNum = (raw: string) => (raw.trim() === "" ? 0 : Number(raw));

function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        value={Number.isNaN(value) ? "" : value}
        disabled={disabled}
        onChange={(e) => onChange(toNum(e.target.value))}
        aria-invalid={!!error}
      />
    </Field>
  );
}

function CheckField({
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
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/* ───────────────────────── ordering ───────────────────────── */

export function OrderingSection({ initial }: { initial: SettingsMap["ordering"] }) {
  const s = useSection("ordering", initial);
  const v = s.value;
  const windows = v.deliveryWindows;
  const setWindows = (next: typeof windows) => s.set("deliveryWindows", next);
  const noPayment = !v.momoEnabled && !v.bankEnabled && !v.codEnabled;

  return (
    <SectionCard
      title="Ordering"
      description="How customers order on the website before finishing on WhatsApp."
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Taking orders</h3>
          <ToggleField
            label="Taking orders"
            checked={v.acceptingOrders}
            onChange={(x) => s.set("acceptingOrders", x)}
          />
          {!v.acceptingOrders && (
            <TextField
              label="Paused message"
              hint="Shown instead of the order form while orders are paused"
              multiline
              value={v.pausedMessage}
              onChange={(x) => s.set("pausedMessage", x)}
              error={s.errors.pausedMessage}
            />
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Payment options</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <ToggleField label="Mobile Money" checked={v.momoEnabled} onChange={(x) => s.set("momoEnabled", x)} />
            <ToggleField label="Bank transfer" checked={v.bankEnabled} onChange={(x) => s.set("bankEnabled", x)} />
            <ToggleField
              label="Pay on delivery / pickup"
              checked={v.codEnabled}
              onChange={(x) => s.set("codEnabled", x)}
            />
          </div>
          {noPayment && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              All payment options are off. Customers won&apos;t be able to choose how to pay.
            </p>
          )}
          <TextField
            label="Payment note"
            value={v.paymentNote}
            onChange={(x) => s.set("paymentNote", x)}
            error={s.errors.paymentNote}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Limits</h3>
          <div className={grid}>
            <NumberField
              label="Order expiry (hours)"
              hint="Orders not sent on WhatsApp within this time expire automatically. Default 48."
              value={v.expiryHours}
              onChange={(x) => s.set("expiryHours", x)}
              error={s.errors.expiryHours}
            />
            <NumberField
              label="Max quantity per item"
              value={v.maxQtyPerItem}
              onChange={(x) => s.set("maxQtyPerItem", x)}
              error={s.errors.maxQtyPerItem}
            />
            <NumberField
              label="Max order total"
              hint="0 = no limit. Above this, customers are asked to message you for a quote."
              value={v.maxOrderTotal}
              onChange={(x) => s.set("maxOrderTotal", x)}
              error={s.errors.maxOrderTotal}
            />
            <TextField
              label="Large order message"
              multiline
              value={v.largeOrderMessage}
              onChange={(x) => s.set("largeOrderMessage", x)}
              error={s.errors.largeOrderMessage}
            />
          </div>
        </div>

        <div className={grid}>
          <TextField
            label="Consent text"
            value={v.consentText}
            onChange={(x) => s.set("consentText", x)}
            error={s.errors.consentText}
          />
          <TextField
            label="Hand-off note"
            hint="Optional extra line on the 'send on WhatsApp' screen"
            value={v.handoffNote}
            onChange={(x) => s.set("handoffNote", x)}
            error={s.errors.handoffNote}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Delivery time options</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={windows.length >= 12}
              onClick={() => setWindows([...windows, { id: crypto.randomUUID(), label: "" }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Add option
            </Button>
          </div>
          {windows.length === 0 && (
            <p className="text-sm text-muted-foreground">No options. Customers won&apos;t pick a delivery time.</p>
          )}
          {windows.map((w, i) => (
            <div key={w.id} className="flex items-start gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Morning (8am–12pm)"
                  value={w.label}
                  aria-invalid={!!s.errors[`deliveryWindows.${i}.label`]}
                  onChange={(e) =>
                    setWindows(windows.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                />
                {s.errors[`deliveryWindows.${i}.label`] && (
                  <p className="text-xs text-destructive">{s.errors[`deliveryWindows.${i}.label`]}</p>
                )}
              </div>
              <ListControls
                index={i}
                length={windows.length}
                onMove={(a, b) => setWindows(move(windows, a, b))}
                onRemove={(j) => setWindows(windows.filter((_, k) => k !== j))}
              />
            </div>
          ))}
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── delivery ───────────────────────── */

export function DeliverySection({ initial }: { initial: SettingsMap["delivery"] }) {
  const s = useSection("delivery", initial);
  const v = s.value;
  const zones = v.zones;
  const setZones = (next: typeof zones) => s.set("zones", next);
  const update = (i: number, patch: Partial<(typeof zones)[number]>) =>
    setZones(zones.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`zones.${i}.${f}`];

  return (
    <SectionCard title="Delivery" description="Delivery areas and fees shown on the order form.">
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <ToggleField
              label="Offer delivery"
              checked={v.deliveryEnabled}
              onChange={(x) => s.set("deliveryEnabled", x)}
            />
            <ToggleField label="Offer pickup" checked={v.pickupEnabled} onChange={(x) => s.set("pickupEnabled", x)} />
          </div>
          <p className="text-xs text-muted-foreground">Pickup points come from Locations with type &lsquo;pickup&rsquo;.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Delivery zones</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={zones.length >= 100}
              onClick={() =>
                setZones([
                  ...zones,
                  { id: crypto.randomUUID(), name: "", areas: "", fee: 0, etaText: "", isActive: true },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add zone
            </Button>
          </div>
          {zones.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No zones yet — customers will type their area and you&apos;ll confirm the fee on WhatsApp.
            </p>
          )}
          {zones.map((z, i) => (
            <div key={z.id} className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <ToggleField label="Active" checked={z.isActive} onChange={(x) => update(i, { isActive: x })} />
                <ListControls
                  index={i}
                  length={zones.length}
                  onMove={(a, b) => setZones(move(zones, a, b))}
                  onRemove={(j) => setZones(zones.filter((_, k) => k !== j))}
                />
              </div>
              <div className={grid}>
                <TextField label="Zone name" value={z.name} onChange={(x) => update(i, { name: x })} error={err(i, "name")} />
                <TextField
                  label="Delivery time"
                  placeholder="Same day"
                  value={z.etaText}
                  onChange={(x) => update(i, { etaText: x })}
                  error={err(i, "etaText")}
                />
                <div className="sm:col-span-2">
                  <TextField
                    label="Areas"
                    hint="Neighbourhoods in this zone, shown to customers"
                    multiline
                    value={z.areas}
                    onChange={(x) => update(i, { areas: x })}
                    error={err(i, "areas")}
                  />
                </div>
                <div className="space-y-2">
                  <NumberField
                    label="Fee (GHS)"
                    value={z.fee ?? 0}
                    disabled={z.fee === null}
                    onChange={(x) => update(i, { fee: x })}
                    error={err(i, "fee")}
                  />
                  <CheckField
                    label="Confirm fee on WhatsApp"
                    checked={z.fee === null}
                    onChange={(x) => update(i, { fee: x ? null : 0 })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <ToggleField
            label="Let customers order from areas not listed (fee confirmed on WhatsApp)"
            checked={v.allowUnlistedAreas}
            onChange={(x) => s.set("allowUnlistedAreas", x)}
          />
          <div className="space-y-2">
            <CheckField
              label="Free delivery over an amount"
              checked={v.freeDeliveryOver !== null}
              onChange={(x) => s.set("freeDeliveryOver", x ? 0 : null)}
            />
            {v.freeDeliveryOver !== null && (
              <div className="max-w-xs">
                <NumberField
                  label="Free delivery over (GHS)"
                  value={v.freeDeliveryOver}
                  onChange={(x) => s.set("freeDeliveryOver", x)}
                  error={s.errors.freeDeliveryOver}
                />
              </div>
            )}
          </div>
          <TextField
            label="Delivery note"
            value={v.deliveryNote}
            onChange={(x) => s.set("deliveryNote", x)}
            error={s.errors.deliveryNote}
          />
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── whatsapp ───────────────────────── */

const SAMPLE_VARS: Record<string, string> = {
  orderNumber: "WB-2611-0042",
  name: "Ama",
  items: "• 2 × Hibiscus Ginger (GHS 50) = GHS 100",
  subtotal: "GHS 100",
  deliveryFee: "East Legon GHS 20",
  total: "GHS 120",
  amountDue: "GHS 120",
  payment: "Mobile Money",
  fulfilment: "Delivery to: East Legon",
  address: "East Legon, near A&C Mall",
  window: "Afternoon",
  gift: "",
  note: "",
  link: "https://www.wellnessgroupgh.com/o/abc123",
  code: "4821",
  riderLink: "https://www.wellnessgroupgh.com/r/xyz",
  paymentDetails: "MTN MoMo · Merchant ID 123456",
  hours: "8am–6pm",
  pickupLocation: "Dome shop",
  reason: "Out of stock",
};

export function WhatsappSection({
  initial,
  brandName,
}: {
  initial: SettingsMap["whatsapp"];
  brandName?: string;
}) {
  const s = useSection("whatsapp", initial);
  const v = s.value;
  const vars = { ...SAMPLE_VARS, brand: brandName?.trim() || "Wellness Brew" };

  const copy = (name: string) => {
    void navigator.clipboard
      ?.writeText(`{${name}}`)
      .then(() => toast.success(`Copied {${name}}`))
      .catch(() => toast.error("Couldn't copy"));
  };

  return (
    <SectionCard
      title="WhatsApp messages"
      description="Messages prefilled in WhatsApp. Staff send them with one tap from an order."
    >
      <div className="mb-6 rounded-lg border bg-muted/40 p-4">
        <p className="mb-2 text-sm font-medium">Placeholders you can use (click to copy)</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_PLACEHOLDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => copy(p)}
              className="rounded bg-background px-1.5 py-0.5 font-mono text-xs ring-1 ring-border hover:bg-accent"
            >
              {`{${p}}`}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Lines whose placeholder is empty on an order (like gift or note) are left out automatically.
        </p>
      </div>

      <div className="space-y-6">
        {WHATSAPP_TEMPLATE_KEYS.map((key) => {
          const info = WHATSAPP_TEMPLATE_INFO[key];
          const text = v[key];
          const missing =
            key === "orderMessage"
              ? ["{orderNumber}", "{link}"].filter((p) => !text.includes(p))
              : [];
          return (
            <div key={key} className="space-y-2">
              <TextField
                label={info.label}
                hint={info.hint || undefined}
                multiline
                rows={5}
                value={text}
                onChange={(x) => s.set(key, x)}
                error={s.errors[key]}
              />
              {missing.length > 0 && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Missing {missing.join(" and ")}. Orders may not be matched without it.
                </p>
              )}
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Preview with sample values</p>
                <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-sans text-xs text-muted-foreground">
                  {fillTemplate(text, vars) || "(empty)"}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}
