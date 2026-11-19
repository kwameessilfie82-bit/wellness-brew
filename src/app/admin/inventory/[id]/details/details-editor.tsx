"use client";

import { Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field, ListControls, SaveBar, SectionCard, TextField, grid, move } from "@/app/admin/settings/fields";
import { formatPrice } from "@/lib/format";
import {
  BREW_STYLES,
  pricePerServing,
  productCompleteness,
  type ProductDetails,
} from "@/lib/products/details";
import type { TaxonomySettings } from "@/lib/settings/growth-schemas";
import { TAXONOMY_GROUPS } from "@/lib/settings/growth-schemas";
import type { BannedPhrase } from "@/lib/settings/schemas";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Textarea } from "@/ui/primitives/textarea";

import { saveProductDetails } from "./actions";

const GROUP_LABEL = { flavours: "Flavour", formats: "Format", occasions: "Occasion" } as const;
const STYLE_LABEL = { hot: "Hot", iced: "Iced", both: "Hot or iced" } as const;

const numOrNull = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

export function DetailsEditor({
  productId,
  price,
  base,
  initial,
  taxonomy,
  bannedPhrases,
}: {
  productId: string;
  price: number;
  base: { description: string | null; images: string; fdaRegNumber: string | null };
  initial: ProductDetails;
  taxonomy: TaxonomySettings;
  bannedPhrases: BannedPhrase[];
}) {
  const [saved, setSaved] = useState(initial);
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(saved) !== JSON.stringify(v);
  const set = <K extends keyof ProductDetails>(k: K, x: ProductDetails[K]) => setV((p) => ({ ...p, [k]: x }));
  const setBrew = <K extends keyof ProductDetails["brewing"]>(k: K, x: ProductDetails["brewing"][K]) =>
    setV((p) => ({ ...p, brewing: { ...p.brewing, [k]: x } }));
  const completeness = useMemo(() => productCompleteness({ ...base, details: v }), [base, v]);
  const perServing = pricePerServing(price, v);

  const save = () =>
    start(async () => {
      const res = await saveProductDetails(productId, v);
      if (res.ok) {
        setSaved(v);
        setErrors({});
        toast.success("Product details saved. Live on the site now.");
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  const toggleTerm = (id: string) =>
    set("terms", v.terms.includes(id) ? v.terms.filter((t) => t !== id) : [...v.terms, id]);

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-xl border p-4",
          completeness.level === "green" && "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30",
          completeness.level === "amber" && "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
          completeness.level === "red" && "border-red-500/40 bg-red-50 dark:bg-red-950/30",
        )}
      >
        <p className="font-semibold">Completeness: {completeness.score}%</p>
        {completeness.missing.length > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Missing: {completeness.missing.join(" · ")}</p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Everything is filled in.</p>
        )}
      </div>

      <SectionCard title="Facts" description="Ingredients, taste and pack information.">
        <div className={grid}>
          <div className="sm:col-span-2">
            <TextField
              label="Ingredients"
              hint="List every ingredient, as on the pack."
              multiline
              value={v.ingredients}
              onChange={(x) => set("ingredients", x)}
              error={errors.ingredients}
            />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label="Tasting notes"
              multiline
              value={v.tastingNotes}
              onChange={(x) => set("tastingNotes", x)}
              error={errors.tastingNotes}
              bannedPhrases={bannedPhrases}
            />
          </div>
          <TextField label="Net weight" placeholder="e.g. 40 g" value={v.netWeight} onChange={(x) => set("netWeight", x)} error={errors.netWeight} />
          <TextField label="Serving name" placeholder="bag" hint="Shown as “price per bag”." value={v.servingSize} onChange={(x) => set("servingSize", x)} error={errors.servingSize} />
          <Field
            label="Bags / servings per pack"
            hint={perServing ? `${formatPrice(perServing)} per ${v.servingSize || "bag"}` : "Used to show the price per bag."}
            error={errors.servingsPerPack}
          >
            <Input inputMode="numeric" value={v.servingsPerPack ?? ""} onChange={(e) => set("servingsPerPack", numOrNull(e.target.value))} />
          </Field>
          <TextField label="Shelf life" placeholder="e.g. 18 months from packing" value={v.shelfLife} onChange={(x) => set("shelfLife", x)} error={errors.shelfLife} />
          <div className="sm:col-span-2">
            <TextField label="Storage" placeholder="Store in a cool, dry place away from sunlight." value={v.storage} onChange={(x) => set("storage", x)} error={errors.storage} />
          </div>
          <div className="sm:col-span-2">
            <TextField
              label="Cautions"
              multiline
              placeholder="Not recommended during pregnancy. Speak to your doctor if you take blood-pressure medication."
              value={v.cautions}
              onChange={(x) => set("cautions", x)}
              error={errors.cautions}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Brewing guide" description="Shown as quick facts next to the buy button.">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Water (ml)" error={errors["brewing.waterMl"]}>
            <Input inputMode="numeric" value={v.brewing.waterMl ?? ""} onChange={(e) => setBrew("waterMl", numOrNull(e.target.value))} />
          </Field>
          <Field label="Temperature (°C)" error={errors["brewing.tempC"]}>
            <Input inputMode="numeric" value={v.brewing.tempC ?? ""} onChange={(e) => setBrew("tempC", numOrNull(e.target.value))} />
          </Field>
          <TextField label="Steep (minutes)" placeholder="5–7" value={v.brewing.minutes} onChange={(x) => setBrew("minutes", x)} error={errors["brewing.minutes"]} />
          <Field label="Serve">
            <NativeSelect
              value={v.brewing.style ?? ""}
              onChange={(e) => setBrew("style", (e.target.value || null) as ProductDetails["brewing"]["style"])}
            >
              <NativeSelectOption value="">—</NativeSelectOption>
              {BREW_STYLES.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {STYLE_LABEL[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <div className="mt-4">
          <TextField
            label="Instructions (optional)"
            multiline
            value={v.brewing.instructions}
            onChange={(x) => setBrew("instructions", x)}
            error={errors["brewing.instructions"]}
          />
        </div>
      </SectionCard>

      <SectionCard title="Taxonomy" description="Tags power shop filters and the Tea Finder. Edit the lists in Settings → Taxonomy.">
        <div className="space-y-4">
          {TAXONOMY_GROUPS.map((g) => (
            <div key={g}>
              <p className="mb-2 text-sm font-medium">{GROUP_LABEL[g]}</p>
              <div className="flex flex-wrap gap-2">
                {taxonomy[g].length === 0 && <span className="text-sm text-muted-foreground">No terms yet.</span>}
                {taxonomy[g].map((t) => {
                  const on = v.terms.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTerm(t.id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Product FAQ" description="Questions shown on the product page (and to Google as FAQ results).">
        <div className="space-y-4">
          {v.faq.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
          {v.faq.map((f, i) => (
            <div key={f.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <Input
                  placeholder="Question"
                  value={f.question}
                  aria-invalid={!!errors[`faq.${i}.question`]}
                  onChange={(e) => set("faq", v.faq.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))}
                />
                <ListControls
                  index={i}
                  length={v.faq.length}
                  onMove={(a, b) => set("faq", move(v.faq, a, b))}
                  onRemove={(j) => set("faq", v.faq.filter((_, k) => k !== j))}
                />
              </div>
              <Textarea
                placeholder="Answer"
                rows={3}
                value={f.answer}
                onChange={(e) => set("faq", v.faq.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))}
              />
              {errors[`faq.${i}.question`] && <p className="text-xs text-destructive">{errors[`faq.${i}.question`]}</p>}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => set("faq", [...v.faq, { id: crypto.randomUUID(), question: "", answer: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add question
          </Button>
        </div>
        <SaveBar dirty={dirty} pending={pending} onSave={save} onReset={() => setV(saved)} />
      </SectionCard>
    </div>
  );
}
