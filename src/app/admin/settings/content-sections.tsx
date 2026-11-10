"use client";

import { Plus, ScanSearch, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CLAIM_STATUSES,
  CONTENT_ICONS,
  REGISTRATION_STATUSES,
  type BannedPhrase,
  type SettingsMap,
} from "@/lib/settings/schemas";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

import { scanClaims, type ClaimScanHit } from "./claims-actions";
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

const ICON_LABELS: Record<(typeof CONTENT_ICONS)[number], string> = {
  award: "Award",
  truck: "Truck",
  leaf: "Leaf",
  heart: "Heart",
  sparkles: "Sparkles",
  shield: "Shield",
  clock: "Clock",
  gift: "Gift",
  coffee: "Cup",
  sun: "Sun",
  star: "Star",
  message: "Message",
};

const MAX_VALUE_PROPS = 6;
const MAX_ABOUT_IMAGES = 8;

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 mt-6 text-sm font-semibold first:mt-0">{children}</h3>;
}

/* ───────────────────────── homepage ───────────────────────── */

export function HomepageSection({
  initial,
  bannedPhrases,
}: {
  initial: SettingsMap["homepage"];
  bannedPhrases: BannedPhrase[];
}) {
  const s = useSection("homepage", initial);
  const v = s.value;
  const props = v.valueProps;
  const setProps = (next: typeof props) => s.set("valueProps", next);
  const updateProp = (i: number, patch: Partial<(typeof props)[number]>) =>
    setProps(props.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`valueProps.${i}.${f}`];

  const text = (
    label: string,
    field: Exclude<keyof typeof v, "valueProps" | "showcase">,
    extra?: { hint?: string; multiline?: boolean; copy?: boolean },
  ) => (
    <TextField
      label={label}
      value={v[field]}
      onChange={(x) => s.set(field, x)}
      error={s.errors[field]}
      hint={extra?.hint}
      multiline={extra?.multiline}
      bannedPhrases={extra?.copy === false ? undefined : bannedPhrases}
    />
  );
  const link = (label: string, field: Exclude<keyof typeof v, "valueProps" | "showcase">) =>
    text(label, field, { copy: false });

  return (
    <SectionCard title="Homepage" description="Homepage copy. Use {brand} to insert the brand name.">
      <GroupTitle>Hero</GroupTitle>
      <div className={grid}>
        {text("Badge", "badge")}
        {text("Headline", "titleLead")}
        {text("Headline highlight (coloured)", "titleHighlight")}
        <div className="sm:col-span-2">{text("Subtitle", "subtitle", { multiline: true })}</div>
        {text("Primary button label", "primaryCtaLabel")}
        {link("Primary button link", "primaryCtaHref")}
        {text("Secondary button label", "secondaryCtaLabel")}
        {link("Secondary button link", "secondaryCtaHref")}
        <ImageField
          label="Hero image"
          value={v.heroImageUrl}
          onChange={(x) => s.set("heroImageUrl", x)}
          error={s.errors.heroImageUrl}
        />
        {text("Hero image alt text", "heroImageAlt", { hint: "Describe the image for screen readers." })}
      </div>

      <GroupTitle>Featured products heading</GroupTitle>
      <div className={grid}>
        {text("Eyebrow", "featuredEyebrow")}
        {text("Title", "featuredTitle")}
        <div className="sm:col-span-2">{text("Subtitle", "featuredSubtitle")}</div>
      </div>

      <GroupTitle>Value points</GroupTitle>
      <div className="space-y-4">
        {props.length === 0 && <p className="text-sm text-muted-foreground">No value points yet.</p>}
        {props.map((p, i) => (
          <div key={p.id} className="rounded-lg border p-4">
            <div className="mb-3 flex justify-end">
              <ListControls
                index={i}
                length={props.length}
                onMove={(a, b) => setProps(move(props, a, b))}
                onRemove={(j) => setProps(props.filter((_, k) => k !== j))}
              />
            </div>
            <div className={grid}>
              <Field label="Icon">
                <NativeSelect
                  value={p.icon}
                  onChange={(e) => updateProp(i, { icon: e.target.value as (typeof CONTENT_ICONS)[number] })}
                >
                  {CONTENT_ICONS.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {ICON_LABELS[t]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <TextField
                label="Title"
                value={p.title}
                onChange={(x) => updateProp(i, { title: x })}
                error={err(i, "title")}
                bannedPhrases={bannedPhrases}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Text"
                  value={p.text}
                  onChange={(x) => updateProp(i, { text: x })}
                  error={err(i, "text")}
                  bannedPhrases={bannedPhrases}
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={props.length >= MAX_VALUE_PROPS}
          onClick={() =>
            setProps([...props, { id: crypto.randomUUID(), icon: "leaf", title: "", text: "" }])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add value point ({props.length}/{MAX_VALUE_PROPS})
        </Button>
      </div>

      <GroupTitle>Blend showcase (animated image strip)</GroupTitle>
      <div className={grid}>
        {text("Eyebrow", "showcaseEyebrow")}
        {text("Title", "showcaseTitle")}
        <div className="sm:col-span-2">{text("Subtitle", "showcaseSubtitle")}</div>
      </div>
      <div className="mt-4 space-y-4">
        {v.showcase.length === 0 && <p className="text-sm text-muted-foreground">No images — the strip is hidden.</p>}
        {v.showcase.map((img, i) => {
          const update = (patch: Partial<(typeof v.showcase)[number]>) =>
            s.set(
              "showcase",
              v.showcase.map((x, j) => (j === i ? { ...x, ...patch } : x)),
            );
          return (
            <div key={img.id} className="rounded-lg border p-4">
              <div className="mb-3 flex justify-end">
                <ListControls
                  index={i}
                  length={v.showcase.length}
                  onMove={(a, b) => s.set("showcase", move(v.showcase, a, b))}
                  onRemove={(j) => s.set("showcase", v.showcase.filter((_, k) => k !== j))}
                />
              </div>
              <div className={grid}>
                <ImageField
                  label="Image"
                  value={img.url}
                  onChange={(x) => update({ url: x })}
                  error={s.errors[`showcase.${i}.url`]}
                />
                <div className="space-y-4">
                  <TextField
                    label="Caption"
                    value={img.title}
                    onChange={(x) => update({ title: x })}
                    error={s.errors[`showcase.${i}.title`]}
                    bannedPhrases={bannedPhrases}
                  />
                  <TextField
                    label="Link (optional)"
                    hint="e.g. /shop or a product page"
                    value={img.href}
                    onChange={(x) => update({ href: x })}
                    error={s.errors[`showcase.${i}.href`]}
                  />
                </div>
              </div>
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          disabled={v.showcase.length >= 12}
          onClick={() => s.set("showcase", [...v.showcase, { id: crypto.randomUUID(), url: "", title: "", href: "/shop" }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Add image ({v.showcase.length}/12)
        </Button>
      </div>

      <GroupTitle>Closing call to action</GroupTitle>
      <div className={grid}>
        {text("Title", "closingTitle")}
        {text("Text", "closingText")}
        {text("Button label", "closingCtaLabel")}
        {link("Button link", "closingCtaHref")}
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── about ───────────────────────── */

export function AboutSection({
  initial,
  bannedPhrases,
}: {
  initial: SettingsMap["about"];
  bannedPhrases: BannedPhrase[];
}) {
  const s = useSection("about", initial);
  const v = s.value;
  const images = v.images;
  const setImages = (next: typeof images) => s.set("images", next);
  const updateImage = (i: number, patch: Partial<(typeof images)[number]>) =>
    setImages(images.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`images.${i}.${f}`];

  const text = (
    label: string,
    field: Exclude<keyof typeof v, "images">,
    extra?: { hint?: string; rows?: number },
  ) => (
    <TextField
      label={label}
      value={v[field]}
      onChange={(x) => s.set(field, x)}
      error={s.errors[field]}
      hint={extra?.hint}
      multiline={extra?.rows !== undefined}
      rows={extra?.rows}
      bannedPhrases={bannedPhrases}
    />
  );
  const paragraphsHint = "Leave a blank line between paragraphs.";

  return (
    <SectionCard
      title="About page"
      description="The story page. Use {brand} to insert the brand name."
    >
      <div className="space-y-4">
        {text("Page title", "title")}
        {text("Intro", "intro", { rows: 4 })}
        {text("Story heading", "storyTitle")}
        {text("Story", "story", { rows: 8, hint: paragraphsHint })}
        {text("Mission heading", "missionTitle")}
        {text("Mission", "mission", { rows: 8, hint: paragraphsHint })}
      </div>

      <GroupTitle>Images</GroupTitle>
      <div className="space-y-4">
        {images.length === 0 && <p className="text-sm text-muted-foreground">No images yet.</p>}
        {images.map((img, i) => (
          <div key={img.id} className="rounded-lg border p-4">
            <div className="mb-3 flex justify-end">
              <ListControls
                index={i}
                length={images.length}
                onMove={(a, b) => setImages(move(images, a, b))}
                onRemove={(j) => setImages(images.filter((_, k) => k !== j))}
              />
            </div>
            <div className={grid}>
              <ImageField
                label="Image"
                value={img.url}
                onChange={(x) => updateImage(i, { url: x })}
                error={err(i, "url")}
              />
              <TextField
                label="Alt text"
                hint="Describe the image for screen readers."
                value={img.alt}
                onChange={(x) => updateImage(i, { alt: x })}
                error={err(i, "alt")}
                bannedPhrases={bannedPhrases}
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={images.length >= MAX_ABOUT_IMAGES}
          onClick={() => setImages([...images, { id: crypto.randomUUID(), url: "", alt: "" }])}
        >
          <Plus className="mr-1 h-4 w-4" /> Add image ({images.length}/{MAX_ABOUT_IMAGES})
        </Button>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── compliance ───────────────────────── */

export function ComplianceSection({ initial }: { initial: SettingsMap["compliance"] }) {
  const s = useSection("compliance", initial);
  const v = s.value;
  const regs = v.registrations;
  const setRegs = (next: typeof regs) => s.set("registrations", next);
  const update = (i: number, patch: Partial<(typeof regs)[number]>) =>
    setRegs(regs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const err = (i: number, f: string) => s.errors[`registrations.${i}.${f}`];

  return (
    <SectionCard
      title="Compliance"
      description="Product identification, the health disclaimer and regulatory registrations shown on the site."
    >
      <div className={grid}>
        <TextField
          label="Botanical name"
          hint="Shown on product pages, e.g. Hibiscus sabdariffa"
          value={v.botanicalName}
          onChange={(x) => s.set("botanicalName", x)}
          error={s.errors.botanicalName}
        />
        <TextField
          label="Common names"
          value={v.commonNames}
          onChange={(x) => s.set("commonNames", x)}
          error={s.errors.commonNames}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Disclaimer"
            multiline
            rows={4}
            value={v.disclaimer}
            onChange={(x) => s.set("disclaimer", x)}
            error={s.errors.disclaimer}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-6">
        <ToggleField
          label="Show disclaimer in the site footer"
          checked={v.showDisclaimerInFooter}
          onChange={(x) => s.set("showDisclaimerInFooter", x)}
        />
        <ToggleField
          label="Show disclaimer on product pages"
          checked={v.showDisclaimerOnProducts}
          onChange={(x) => s.set("showDisclaimerOnProducts", x)}
        />
      </div>

      <GroupTitle>Registrations</GroupTitle>
      <p className="-mt-2 mb-3 text-xs text-muted-foreground">
        Only approved registrations with a number are shown publicly.
      </p>
      <div className="space-y-4">
        {regs.length === 0 && <p className="text-sm text-muted-foreground">No registrations yet.</p>}
        {regs.map((r, i) => (
          <div key={r.id} className="rounded-lg border p-4">
            <div className="mb-3 flex justify-end">
              <ListControls
                index={i}
                length={regs.length}
                onMove={(a, b) => setRegs(move(regs, a, b))}
                onRemove={(j) => setRegs(regs.filter((_, k) => k !== j))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <TextField
                label="Label"
                placeholder="FDA Ghana registration"
                value={r.label}
                onChange={(x) => update(i, { label: x })}
                error={err(i, "label")}
              />
              <TextField
                label="Number"
                value={r.number}
                onChange={(x) => update(i, { number: x })}
                error={err(i, "number")}
              />
              <Field label="Status">
                <NativeSelect
                  value={r.status}
                  onChange={(e) => update(i, { status: e.target.value as (typeof REGISTRATION_STATUSES)[number] })}
                >
                  {REGISTRATION_STATUSES.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {t === "approved" ? "Approved" : "Pending"}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setRegs([...regs, { id: crypto.randomUUID(), label: "", number: "", status: "pending" }])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add registration
        </Button>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}

/* ───────────────────────── claims ───────────────────────── */

type ScanResult = { hits: ClaimScanHit[]; scanned: number };

function ScanCard() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ScanResult | null>(null);

  const run = () =>
    startTransition(async () => {
      const res = await scanClaims();
      if (res.ok) setResult({ hits: res.hits, scanned: res.scanned });
      else toast.error(res.error);
    });

  const groups = new Map<string, ClaimScanHit[]>();
  for (const h of result?.hits ?? []) groups.set(h.where, [...(groups.get(h.where) ?? []), h]);

  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Scan the site</h3>
          <p className="text-xs text-muted-foreground">Scans the saved list — save changes first.</p>
        </div>
        <Button type="button" variant="outline" disabled={pending} onClick={run}>
          <ScanSearch className="mr-1 h-4 w-4" />
          {pending ? "Scanning…" : "Scan now"}
        </Button>
      </div>
      {result && (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-medium">
            Scanned {result.scanned} texts — {result.hits.length} issues
          </p>
          {[...groups.entries()].map(([where, hits]) => (
            <div key={where} className="space-y-2">
              <h4 className="text-sm font-semibold">{where}</h4>
              <ul className="space-y-2">
                {hits.map((h, i) => (
                  <li key={i} className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs dark:bg-amber-950/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-medium">{h.field}</span> · &ldquo;{h.phrase}&rdquo;
                        {h.reason ? ` — ${h.reason}` : ""}
                      </span>
                      <Link href={h.editHref} className="font-medium underline">
                        Edit
                      </Link>
                    </div>
                    <p className="mt-1 text-muted-foreground">{h.excerpt}</p>
                    {h.suggestion && <p className="mt-1 font-medium">Try: {h.suggestion}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClaimsSection({ initial }: { initial: SettingsMap["claims"] }) {
  const s = useSection("claims", initial);
  const [filter, setFilter] = useState("");
  const banned = s.value.bannedPhrases;
  const register = s.value.register;
  const setBanned = (next: typeof banned) => s.set("bannedPhrases", next);
  const setRegister = (next: typeof register) => s.set("register", next);
  const updateBanned = (i: number, patch: Partial<(typeof banned)[number]>) =>
    setBanned(banned.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const updateReg = (i: number, patch: Partial<(typeof register)[number]>) =>
    setRegister(register.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const bErr = (i: number, f: string) => s.errors[`bannedPhrases.${i}.${f}`];
  const rErr = (i: number, f: string) => s.errors[`register.${i}.${f}`];

  const q = filter.trim().toLowerCase();
  const visible = banned
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => !q || b.phrase.toLowerCase().includes(q));

  return (
    <SectionCard
      title="Claims & wording"
      description="Words you don't want on the site, and the claims you've approved. Editors across the dashboard warn when a banned phrase is typed."
    >
      <ScanCard />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Banned phrases ({banned.length})</h3>
        <div className="flex gap-2">
          {banned.length > 8 && (
            <Input
              className="w-48"
              placeholder="Search phrases…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFilter("");
              setBanned([...banned, { id: crypto.randomUUID(), phrase: "", reason: "", suggestion: "" }]);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add phrase
          </Button>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {banned.length === 0 && <p className="text-sm text-muted-foreground">No banned phrases.</p>}
        {banned.length > 0 && visible.length === 0 && (
          <p className="text-sm text-muted-foreground">No phrases match your search.</p>
        )}
        {visible.map(({ b, i }) => (
          <div key={b.id} className="flex flex-wrap items-start gap-2">
            <div className="w-44">
              <Input
                placeholder="Phrase"
                value={b.phrase}
                aria-invalid={!!bErr(i, "phrase")}
                onChange={(e) => updateBanned(i, { phrase: e.target.value })}
              />
              {bErr(i, "phrase") && <p className="text-xs text-destructive">{bErr(i, "phrase")}</p>}
            </div>
            <Input
              className="min-w-48 flex-1"
              placeholder="Why it's a problem"
              value={b.reason}
              onChange={(e) => updateBanned(i, { reason: e.target.value })}
            />
            <Input
              className="min-w-48 flex-1"
              placeholder="Say this instead"
              value={b.suggestion}
              onChange={(e) => updateBanned(i, { suggestion: e.target.value })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setBanned(banned.filter((_, k) => k !== i))}
              aria-label="Remove"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <GroupTitle>Claim register</GroupTitle>
      <div className="space-y-4">
        {register.length === 0 && <p className="text-sm text-muted-foreground">No claims recorded.</p>}
        {register.map((c, i) => (
          <div key={c.id} className="rounded-lg border p-4">
            <div className="mb-3 flex justify-end">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setRegister(register.filter((_, k) => k !== i))}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className={grid}>
              <div className="sm:col-span-2">
                <TextField
                  label="Claim"
                  multiline
                  value={c.claim}
                  onChange={(x) => updateReg(i, { claim: x })}
                  error={rErr(i, "claim")}
                />
              </div>
              <Field label="Status">
                <NativeSelect
                  value={c.status}
                  onChange={(e) => updateReg(i, { status: e.target.value as (typeof CLAIM_STATUSES)[number] })}
                >
                  {CLAIM_STATUSES.map((t) => (
                    <NativeSelectOption key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <TextField
                label="Reviewed on"
                type="date"
                value={c.reviewedOn}
                onChange={(x) => updateReg(i, { reviewedOn: x })}
                error={rErr(i, "reviewedOn")}
              />
              <div className="sm:col-span-2">
                <TextField
                  label="Evidence"
                  hint="Study, certificate or approval reference"
                  multiline
                  value={c.evidence}
                  onChange={(x) => updateReg(i, { evidence: x })}
                  error={rErr(i, "evidence")}
                />
              </div>
              <div className="sm:col-span-2">
                <TextField
                  label="Where it's used"
                  value={c.usedOn}
                  onChange={(x) => updateReg(i, { usedOn: x })}
                  error={rErr(i, "usedOn")}
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setRegister([
              ...register,
              { id: crypto.randomUUID(), claim: "", status: "pending", evidence: "", usedOn: "", reviewedOn: "" },
            ])
          }
        >
          <Plus className="mr-1 h-4 w-4" /> Add claim
        </Button>
      </div>
      <SaveBar dirty={s.dirty} pending={s.pending} onSave={s.save} onReset={s.reset} />
    </SectionCard>
  );
}
