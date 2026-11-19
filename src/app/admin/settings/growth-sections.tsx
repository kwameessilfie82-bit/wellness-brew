"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  HOMEPAGE_SECTION_KEYS,
  PAGE_KEYS,
  TAXONOMY_GROUPS,
  type TaxonomyGroup,
  type TaxonomySettings,
} from "@/lib/settings/growth-schemas";
import type { BannedPhrase, SettingsMap } from "@/lib/settings/schemas";
import { ClaimWarnings } from "@/ui/components/admin/claim-warnings";
import { Markdown } from "@/ui/components/markdown";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Textarea } from "@/ui/primitives/textarea";

import {
  Field,
  ImageField,
  ListControls,
  SaveBar,
  SectionCard,
  TextField,
  ToggleField,
  grid,
  move,
  useSection,
} from "./fields";

/** Number input that keeps a number (or null) in state. */
function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  min,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        value={value ?? ""}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </Field>
  );
}

/* ───────────────────────── SEO ───────────────────────── */

export function SeoSection({
  initial,
  bannedPhrases,
}: {
  initial: SettingsMap["seo"];
  bannedPhrases: BannedPhrase[];
}) {
  const s = useSection("seo", initial);
  const v = s.value;
  return (
    <SectionCard
      title="SEO"
      description="How the site appears in Google results and link previews."
    >
      <div className="space-y-4">
        <TextField
          label="Default title"
          hint={`Leave empty to use Brand name + tagline. ~60 characters. (${v.defaultTitle.length}/70)`}
          value={v.defaultTitle}
          onChange={(x) => s.set("defaultTitle", x)}
          error={s.errors.defaultTitle}
        />
        <TextField
          label="Default description"
          multiline
          hint={`~155 characters. (${v.defaultDescription.length}/170)`}
          value={v.defaultDescription}
          onChange={(x) => s.set("defaultDescription", x)}
          error={s.errors.defaultDescription}
          bannedPhrases={bannedPhrases}
        />
        <ImageField
          label="Link preview image"
          hint="1200×630 image for link previews; empty = auto-generated"
          value={v.ogImageUrl}
          onChange={(x) => s.set("ogImageUrl", x)}
          error={s.errors.ogImageUrl}
        />
        <TextField
          label="Keywords"
          hint="Comma-separated"
          value={v.keywords}
          onChange={(x) => s.set("keywords", x)}
          error={s.errors.keywords}
        />
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Tracking ───────────────────────── */

const SITE_BASE = "https://www.wellnessgroupgh.com";

function UtmBuilder({ presets }: { presets: SettingsMap["tracking"]["utmPresets"] }) {
  const [path, setPath] = useState("/shop");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");

  const trimmed = path.trim();
  let url = trimmed;
  if (trimmed) {
    const base = trimmed.startsWith("/") ? `${SITE_BASE}${trimmed}` : trimmed;
    try {
      const u = new URL(base);
      if (source.trim()) u.searchParams.set("utm_source", source.trim());
      if (medium.trim()) u.searchParams.set("utm_medium", medium.trim());
      if (campaign.trim()) u.searchParams.set("utm_campaign", campaign.trim());
      url = u.toString();
    } catch {
      url = base;
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Couldn't copy. Select the link and copy it manually.");
    }
  };

  return (
    <div className="mt-8 space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">UTM link builder</h3>
        <p className="text-xs text-muted-foreground">
          Make a tagged link for a post or message. Not saved; it is just a helper.
        </p>
      </div>
      <div className={grid}>
        <Field label="Page path or URL">
          <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/shop" />
        </Field>
        <Field label="Preset">
          <NativeSelect
            value=""
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value);
              if (!p) return;
              setSource(p.source);
              setMedium(p.medium);
              setCampaign(p.campaign);
            }}
          >
            <NativeSelectOption value="">Choose a preset…</NativeSelectOption>
            {presets.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.label || "(no label)"}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Source">
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="instagram" />
        </Field>
        <Field label="Medium">
          <Input value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="social" />
        </Field>
        <Field label="Campaign">
          <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="bio" />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input readOnly value={url} className="min-w-48 flex-1" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" disabled={!url} onClick={() => void copy()}>
          Copy
        </Button>
      </div>
    </div>
  );
}

export function TrackingSection({ initial }: { initial: SettingsMap["tracking"] }) {
  const s = useSection("tracking", initial);
  const v = s.value;
  const items = v.utmPresets;
  const setItems = (next: typeof items) => s.set("utmPresets", next);
  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`utmPresets.${i}.${f}`];

  return (
    <SectionCard
      title="Tracking"
      description="Analytics IDs and reusable campaign tags. Tracking only runs for visitors who accept cookies."
    >
      <div className={grid}>
        <TextField
          label="Google Analytics 4 ID"
          placeholder="G-XXXXXXXXXX"
          value={v.ga4Id}
          onChange={(x) => s.set("ga4Id", x)}
          error={s.errors.ga4Id}
        />
        <TextField
          label="Meta Pixel ID"
          hint="The Conversions API token is set by the developer as the META_CAPI_TOKEN environment variable — it is never stored here."
          value={v.metaPixelId}
          onChange={(x) => s.set("metaPixelId", x)}
          error={s.errors.metaPixelId}
        />
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold">UTM presets</h3>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No presets yet.</p>}
        {items.map((p, i) => (
          <div key={p.id} className="rounded-lg border p-4">
            <div className="mb-3 flex justify-end">
              <ListControls
                index={i}
                length={items.length}
                onMove={(a, b) => setItems(move(items, a, b))}
                onRemove={(j) => setItems(items.filter((_, k) => k !== j))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TextField label="Label" value={p.label} onChange={(x) => update(i, { label: x })} error={err(i, "label")} />
              <TextField label="Source" value={p.source} onChange={(x) => update(i, { source: x })} error={err(i, "source")} />
              <TextField label="Medium" value={p.medium} onChange={(x) => update(i, { medium: x })} error={err(i, "medium")} />
              <TextField label="Campaign" value={p.campaign} onChange={(x) => update(i, { campaign: x })} error={err(i, "campaign")} />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setItems([...items, { id: crypto.randomUUID(), label: "", source: "", medium: "", campaign: "" }])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add preset
        </Button>
      </div>

      <UtmBuilder presets={items} />
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Pages & FAQ ───────────────────────── */

function PageCard({
  pageKey,
  value,
  onChange,
  errors,
  bannedPhrases,
}: {
  pageKey: (typeof PAGE_KEYS)[number];
  value: SettingsMap["pages"]["terms"];
  onChange: (v: SettingsMap["pages"]["terms"]) => void;
  errors: Record<string, string>;
  bannedPhrases: BannedPhrase[];
}) {
  const [preview, setPreview] = useState(false);
  const err = (f: string) => errors[`${pageKey}.${f}`];
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-sm font-semibold capitalize">{pageKey}</h3>
      <div className={grid}>
        <TextField label="Title" value={value.title} onChange={(x) => onChange({ ...value, title: x })} error={err("title")} />
        <TextField
          label="Last updated"
          type="date"
          value={value.updatedOn}
          onChange={(x) => onChange({ ...value, updatedOn: x })}
          error={err("updatedOn")}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Body</span>
          <div className="flex gap-1">
            <Button type="button" size="sm" variant={preview ? "ghost" : "secondary"} onClick={() => setPreview(false)}>
              Edit
            </Button>
            <Button type="button" size="sm" variant={preview ? "secondary" : "ghost"} onClick={() => setPreview(true)}>
              Preview
            </Button>
          </div>
        </div>
        {preview ? (
          <div className="min-h-40 rounded-md border p-4">
            <Markdown source={value.body} />
          </div>
        ) : (
          <Textarea
            rows={14}
            className="font-mono text-sm"
            value={value.body}
            aria-invalid={!!err("body")}
            onChange={(e) => onChange({ ...value, body: e.target.value })}
          />
        )}
        {err("body") ? (
          <p className="text-xs text-destructive">{err("body")}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Markdown: ## Heading, - list, **bold**, [link](/path). {"{brand}"} is replaced with your brand name.
          </p>
        )}
        <ClaimWarnings text={value.body} bannedPhrases={bannedPhrases} />
      </div>
    </div>
  );
}

export function PagesSection({
  initial,
  bannedPhrases,
}: {
  initial: SettingsMap["pages"];
  bannedPhrases: BannedPhrase[];
}) {
  const s = useSection("pages", initial);
  const v = s.value;
  const faq = v.faq;
  const items = faq.items;
  const setFaq = (patch: Partial<typeof faq>) => s.set("faq", { ...faq, ...patch });
  const setItems = (next: typeof items) => setFaq({ items: next });
  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`faq.items.${i}.${f}`];

  return (
    <SectionCard
      title="Pages & FAQ"
      description="Terms, privacy, delivery and returns pages, plus the FAQ. Written in Markdown."
    >
      <div className="space-y-4">
        {PAGE_KEYS.map((k) => (
          <PageCard
            key={k}
            pageKey={k}
            value={v[k]}
            onChange={(x) => s.set(k, x)}
            errors={s.errors}
            bannedPhrases={bannedPhrases}
          />
        ))}

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">FAQ</h3>
          <div className={grid}>
            <TextField label="Title" value={faq.title} onChange={(x) => setFaq({ title: x })} error={s.errors["faq.title"]} />
            <TextField label="Intro" value={faq.intro} onChange={(x) => setFaq({ intro: x })} error={s.errors["faq.intro"]} />
          </div>
          {items.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
          {items.map((q, i) => (
            <div key={q.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextField
                    label="Question"
                    value={q.question}
                    onChange={(x) => update(i, { question: x })}
                    error={err(i, "question")}
                  />
                </div>
                <div className="pt-6">
                  <ListControls
                    index={i}
                    length={items.length}
                    onMove={(a, b) => setItems(move(items, a, b))}
                    onRemove={(j) => setItems(items.filter((_, k) => k !== j))}
                  />
                </div>
              </div>
              <TextField
                label="Answer"
                multiline
                value={q.answer}
                onChange={(x) => update(i, { answer: x })}
                error={err(i, "answer")}
                bannedPhrases={bannedPhrases}
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setItems([...items, { id: crypto.randomUUID(), question: "", answer: "" }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add question
          </Button>
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Site toggles ───────────────────────── */

const HOMEPAGE_SECTION_LABELS: Record<(typeof HOMEPAGE_SECTION_KEYS)[number], string> = {
  valueProps: "Value highlights",
  featured: "Featured blends",
  showcase: "Meet the blends strip",
  reviews: "Customer reviews",
  journal: "Latest from the Brew Journal",
  closing: "Closing call to action",
};

export function SiteSection({
  initial,
  bannedPhrases,
}: {
  initial: SettingsMap["site"];
  bannedPhrases: BannedPhrase[];
}) {
  const s = useSection("site", initial);
  const v = s.value;
  const a = v.announcement;
  const m = v.maintenance;
  const setA = (patch: Partial<typeof a>) => s.set("announcement", { ...a, ...patch });
  const setM = (patch: Partial<typeof m>) => s.set("maintenance", { ...m, ...patch });

  return (
    <SectionCard
      title="Announcement & toggles"
      description="A banner across the top of the shop, maintenance mode, and which homepage sections show."
    >
      <div className="space-y-6">
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Announcement bar</h3>
          <ToggleField label="Show the announcement bar" checked={a.enabled} onChange={(x) => setA({ enabled: x })} />
          <div className={grid}>
            <div className="sm:col-span-2">
              <TextField
                label="Text"
                value={a.text}
                onChange={(x) => setA({ text: x })}
                error={s.errors["announcement.text"]}
                bannedPhrases={bannedPhrases}
              />
            </div>
            <TextField label="Link label" value={a.linkLabel} onChange={(x) => setA({ linkLabel: x })} error={s.errors["announcement.linkLabel"]} />
            <TextField
              label="Link"
              placeholder="/shop or https://…"
              value={a.href}
              onChange={(x) => setA({ href: x })}
              error={s.errors["announcement.href"]}
            />
            <TextField
              label="Starts on"
              type="date"
              hint="Optional. Leave empty to show until switched off."
              value={a.startsOn}
              onChange={(x) => setA({ startsOn: x })}
              error={s.errors["announcement.startsOn"]}
            />
            <TextField
              label="Ends on"
              type="date"
              hint="Optional. Leave empty to show until switched off."
              value={a.endsOn}
              onChange={(x) => setA({ endsOn: x })}
              error={s.errors["announcement.endsOn"]}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Maintenance mode</h3>
          <ToggleField label="Switch on maintenance mode" checked={m.enabled} onChange={(x) => setM({ enabled: x })} />
          <p className="text-sm font-medium text-destructive">
            The public shop is replaced by this message. Staff pages and order links keep working.
          </p>
          <div className="space-y-4">
            <TextField label="Title" value={m.title} onChange={(x) => setM({ title: x })} error={s.errors["maintenance.title"]} />
            <TextField
              label="Message"
              multiline
              value={m.message}
              onChange={(x) => setM({ message: x })}
              error={s.errors["maintenance.message"]}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Homepage sections</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {HOMEPAGE_SECTION_KEYS.map((k) => (
              <ToggleField
                key={k}
                label={HOMEPAGE_SECTION_LABELS[k]}
                checked={v.homepageSections[k]}
                onChange={(x) => s.set("homepageSections", { ...v.homepageSections, [k]: x })}
              />
            ))}
          </div>
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Taxonomy ───────────────────────── */

const GROUP_LABELS: Record<TaxonomyGroup, string> = {
  flavours: "Flavours",
  formats: "Formats",
  occasions: "Occasions",
};

export function TaxonomySection({ initial }: { initial: SettingsMap["taxonomy"] }) {
  const s = useSection("taxonomy", initial);
  const v = s.value;
  return (
    <SectionCard
      title="Taxonomy"
      description="Tag products with these in Catalog → Details. They power shop filters and the Tea Finder. Removing a term untags every product."
    >
      <div className="space-y-6">
        {TAXONOMY_GROUPS.map((g) => {
          const items = v[g];
          const setItems = (next: typeof items) => s.set(g, next);
          return (
            <div key={g} className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-semibold">{GROUP_LABELS[g]}</h3>
              {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
              {items.map((t, i) => (
                <div key={t.id} className="flex flex-wrap items-start gap-2">
                  <div className="min-w-48 flex-1">
                    <Input
                      placeholder="Label"
                      value={t.label}
                      aria-invalid={!!s.errors[`${g}.${i}.label`]}
                      onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    />
                    {s.errors[`${g}.${i}.label`] && (
                      <p className="text-xs text-destructive">{s.errors[`${g}.${i}.label`]}</p>
                    )}
                  </div>
                  <ListControls
                    index={i}
                    length={items.length}
                    onMove={(a, b) => setItems(move(items, a, b))}
                    onRemove={(j) => setItems(items.filter((_, k) => k !== j))}
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setItems([...items, { id: crypto.randomUUID(), label: "" }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          );
        })}
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Gifting ───────────────────────── */

export function GiftingSection({
  initial,
  bannedPhrases,
}: {
  initial: SettingsMap["gifting"];
  bannedPhrases: BannedPhrase[];
}) {
  const s = useSection("gifting", initial);
  const v = s.value;
  const tiers = v.tiers;
  const setTiers = (next: typeof tiers) => s.set("tiers", next);
  const update = (i: number, patch: Partial<(typeof tiers)[number]>) =>
    setTiers(tiers.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`tiers.${i}.${f}`];

  return (
    <SectionCard
      title="Corporate & event gifting"
      description="A page where businesses can request a quote for gift orders."
    >
      <div className="space-y-4">
        <ToggleField label="Show the gifting page" checked={v.enabled} onChange={(x) => s.set("enabled", x)} />
        <TextField label="Title" value={v.title} onChange={(x) => s.set("title", x)} error={s.errors.title} />
        <TextField
          label="Intro"
          multiline
          value={v.intro}
          onChange={(x) => s.set("intro", x)}
          error={s.errors.intro}
          bannedPhrases={bannedPhrases}
        />
        <ImageField label="Hero image" value={v.heroImageUrl} onChange={(x) => s.set("heroImageUrl", x)} error={s.errors.heroImageUrl} />

        <h3 className="pt-2 text-sm font-semibold">Gift tiers</h3>
        {tiers.length === 0 && <p className="text-sm text-muted-foreground">No tiers yet.</p>}
        {tiers.map((t, i) => (
          <div key={t.id} className="rounded-lg border p-4">
            <div className="mb-3 flex justify-end">
              <ListControls
                index={i}
                length={tiers.length}
                onMove={(a, b) => setTiers(move(tiers, a, b))}
                onRemove={(j) => setTiers(tiers.filter((_, k) => k !== j))}
              />
            </div>
            <div className={grid}>
              <TextField label="Name" value={t.name} onChange={(x) => update(i, { name: x })} error={err(i, "name")} />
              <TextField label="Lead time" value={t.leadTime} onChange={(x) => update(i, { leadTime: x })} error={err(i, "leadTime")} />
              <div className="sm:col-span-2">
                <TextField
                  label="Contents"
                  multiline
                  value={t.contents}
                  onChange={(x) => update(i, { contents: x })}
                  error={err(i, "contents")}
                  bannedPhrases={bannedPhrases}
                />
              </div>
              <NumberField
                label="Price (GHS)"
                hint="Leave empty for 'price on request'"
                min={0}
                value={t.price}
                onChange={(x) => update(i, { price: x })}
                error={err(i, "price")}
              />
              <NumberField
                label="Minimum quantity"
                min={1}
                value={t.minQty}
                onChange={(x) => update(i, { minQty: x ?? 10 })}
                error={err(i, "minQty")}
              />
              <div className="sm:col-span-2">
                <TextField label="Branding options" value={t.branding} onChange={(x) => update(i, { branding: x })} error={err(i, "branding")} />
              </div>
              <div className="sm:col-span-2">
                <ImageField label="Image" value={t.imageUrl} onChange={(x) => update(i, { imageUrl: x })} error={err(i, "imageUrl")} />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setTiers([
              ...tiers,
              {
                id: crypto.randomUUID(),
                name: "",
                contents: "",
                price: null,
                minQty: 10,
                leadTime: "",
                branding: "",
                imageUrl: "",
              },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add tier
        </Button>

        <div className={grid}>
          <TextField label="Form title" value={v.formTitle} onChange={(x) => s.set("formTitle", x)} error={s.errors.formTitle} />
          <TextField
            label="Success message"
            value={v.successMessage}
            onChange={(x) => s.set("successMessage", x)}
            error={s.errors.successMessage}
          />
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Tea Finder ───────────────────────── */

export function TeaFinderSection({
  initial,
  taxonomy,
}: {
  initial: SettingsMap["teaFinder"];
  taxonomy: TaxonomySettings;
}) {
  const s = useSection("teaFinder", initial);
  const v = s.value;
  const qs = v.questions;
  const setQs = (next: typeof qs) => s.set("questions", next);
  const updateQ = (i: number, patch: Partial<(typeof qs)[number]>) =>
    setQs(qs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (path: string) => s.errors[`questions.${path}`];

  return (
    <SectionCard
      title="Tea Finder"
      description="Each answer points to taxonomy tags. Products with the most matching tags are recommended."
    >
      <div className="space-y-4">
        <ToggleField label="Show the Tea Finder" checked={v.enabled} onChange={(x) => s.set("enabled", x)} />
        <div className={grid}>
          <TextField label="Title" value={v.title} onChange={(x) => s.set("title", x)} error={s.errors.title} />
          <TextField label="Result title" value={v.resultTitle} onChange={(x) => s.set("resultTitle", x)} error={s.errors.resultTitle} />
          <div className="sm:col-span-2">
            <TextField label="Intro" value={v.intro} onChange={(x) => s.set("intro", x)} error={s.errors.intro} />
          </div>
        </div>

        <h3 className="pt-2 text-sm font-semibold">Questions</h3>
        {qs.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
        {qs.map((q, i) => {
          const setAnswers = (next: typeof q.answers) => updateQ(i, { answers: next });
          const updateA = (k: number, patch: Partial<(typeof q.answers)[number]>) =>
            setAnswers(q.answers.map((x, j) => (j === k ? { ...x, ...patch } : x)));
          return (
            <div key={q.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <TextField
                    label={`Question ${i + 1}`}
                    value={q.question}
                    onChange={(x) => updateQ(i, { question: x })}
                    error={err(`${i}.question`)}
                  />
                </div>
                <div className="pt-6">
                  <ListControls
                    index={i}
                    length={qs.length}
                    onMove={(a, b) => setQs(move(qs, a, b))}
                    onRemove={(j) => setQs(qs.filter((_, k) => k !== j))}
                  />
                </div>
              </div>
              {err(`${i}.answers`) && <p className="text-xs text-destructive">{err(`${i}.answers`)}</p>}
              {q.answers.map((a, k) => (
                <div key={a.id} className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Answer"
                        value={a.label}
                        aria-invalid={!!err(`${i}.answers.${k}.label`)}
                        onChange={(e) => updateA(k, { label: e.target.value })}
                      />
                      {err(`${i}.answers.${k}.label`) && (
                        <p className="text-xs text-destructive">{err(`${i}.answers.${k}.label`)}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={q.answers.length <= 2}
                      onClick={() => setAnswers(q.answers.filter((_, j) => j !== k))}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {TAXONOMY_GROUPS.map((g) =>
                      taxonomy[g].length === 0 ? null : (
                        <div key={g} className="flex flex-wrap items-center gap-1.5">
                          <span className="w-20 shrink-0 text-xs text-muted-foreground">{GROUP_LABELS[g]}</span>
                          {taxonomy[g].map((t) => {
                            const on = a.terms.includes(t.id);
                            return (
                              <Button
                                key={t.id}
                                type="button"
                                size="sm"
                                variant={on ? "default" : "outline"}
                                aria-pressed={on}
                                className="h-7 rounded-full px-3 text-xs"
                                onClick={() =>
                                  updateA(k, { terms: on ? a.terms.filter((x) => x !== t.id) : [...a.terms, t.id] })
                                }
                              >
                                {t.label || "(unnamed)"}
                              </Button>
                            );
                          })}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={q.answers.length >= 8}
                onClick={() => setAnswers([...q.answers, { id: crypto.randomUUID(), label: "", terms: [] }])}
              >
                <Plus className="mr-1 h-4 w-4" /> Add answer
              </Button>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={qs.length >= 8}
          onClick={() =>
            setQs([
              ...qs,
              {
                id: crypto.randomUUID(),
                question: "",
                answers: [
                  { id: crypto.randomUUID(), label: "", terms: [] },
                  { id: crypto.randomUUID(), label: "", terms: [] },
                ],
              },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add question
        </Button>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Stockists ───────────────────────── */

export function StockistsSection({ initial }: { initial: SettingsMap["stockists"] }) {
  const s = useSection("stockists", initial);
  const v = s.value;
  const items = v.items;
  const setItems = (next: typeof items) => s.set("items", next);
  const update = (i: number, patch: Partial<(typeof items)[number]>) =>
    setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`items.${i}.${f}`];

  return (
    <SectionCard
      title="Stockists"
      description="Shops and partners where customers can buy your teas, plus the wholesale enquiry form."
    >
      <div className="space-y-4">
        <ToggleField label="Show the Where to buy page" checked={v.enabled} onChange={(x) => s.set("enabled", x)} />
        <TextField label="Title" value={v.title} onChange={(x) => s.set("title", x)} error={s.errors.title} />
        <TextField label="Intro" multiline value={v.intro} onChange={(x) => s.set("intro", x)} error={s.errors.intro} />

        <h3 className="pt-2 text-sm font-semibold">Stockists</h3>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No stockists yet.</p>}
        {items.map((it, i) => (
          <div key={it.id} className="rounded-lg border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <ToggleField label="Show on website" checked={it.isPublic} onChange={(x) => update(i, { isPublic: x })} />
              <ListControls
                index={i}
                length={items.length}
                onMove={(a, b) => setItems(move(items, a, b))}
                onRemove={(j) => setItems(items.filter((_, k) => k !== j))}
              />
            </div>
            <div className={grid}>
              <TextField label="Name" value={it.name} onChange={(x) => update(i, { name: x })} error={err(i, "name")} />
              <TextField label="Area" value={it.area} onChange={(x) => update(i, { area: x })} error={err(i, "area")} />
              <div className="sm:col-span-2">
                <TextField label="Address" value={it.address} onChange={(x) => update(i, { address: x })} error={err(i, "address")} />
              </div>
              <TextField
                label="Google Maps link"
                placeholder="https://maps.app.goo.gl/…"
                value={it.mapUrl}
                onChange={(x) => update(i, { mapUrl: x })}
                error={err(i, "mapUrl")}
              />
              <TextField label="Phone" placeholder="+233 …" value={it.phone} onChange={(x) => update(i, { phone: x })} error={err(i, "phone")} />
              <div className="sm:col-span-2">
                <TextField label="Website" placeholder="https://…" value={it.url} onChange={(x) => update(i, { url: x })} error={err(i, "url")} />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setItems([
              ...items,
              { id: crypto.randomUUID(), name: "", area: "", address: "", mapUrl: "", phone: "", url: "", isPublic: true },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add stockist
        </Button>

        <div className={grid}>
          <TextField label="Partner form title" value={v.partnerTitle} onChange={(x) => s.set("partnerTitle", x)} error={s.errors.partnerTitle} />
          <TextField
            label="Partner form intro"
            multiline
            value={v.partnerIntro}
            onChange={(x) => s.set("partnerIntro", x)}
            error={s.errors.partnerIntro}
          />
        </div>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── Experiments ───────────────────────── */

export function ExperimentsSection({ initial }: { initial: SettingsMap["experiments"] }) {
  const s = useSection("experiments", initial);
  const h = s.value.hero;
  const setH = (patch: Partial<typeof h>) => s.set("hero", { ...h, ...patch });
  const err = (f: string) => s.errors[`hero.${f}`];

  return (
    <SectionCard title="A/B tests" description="Show two versions of a page element and see which one gets more clicks.">
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Homepage headline test</h3>
        <ToggleField label="Run this test" checked={h.enabled} onChange={(x) => setH({ enabled: x })} />
        <NumberField
          label="Split (%)"
          hint="Share of visitors who see version B"
          min={0}
          max={100}
          value={h.splitPercent}
          onChange={(x) => setH({ splitPercent: x ?? 0 })}
          error={err("splitPercent")}
        />
        <p className="text-sm font-medium">Version B</p>
        <div className={grid}>
          <TextField label="Headline start" value={h.titleLead} onChange={(x) => setH({ titleLead: x })} error={err("titleLead")} />
          <TextField
            label="Highlighted headline words"
            value={h.titleHighlight}
            onChange={(x) => setH({ titleHighlight: x })}
            error={err("titleHighlight")}
          />
          <TextField
            label="Main button label"
            hint="Empty fields fall back to the normal homepage text."
            value={h.primaryCtaLabel}
            onChange={(x) => setH({ primaryCtaLabel: x })}
            error={err("primaryCtaLabel")}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Results (views and button clicks per version) appear in Insights → KPIs.
        </p>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}
