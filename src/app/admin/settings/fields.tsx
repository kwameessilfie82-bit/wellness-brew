"use client";

import { ArrowDown, ArrowUp, Save, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import type { BannedPhrase, SettingsMap, SettingsSection } from "@/lib/settings/schemas";
import { ClaimWarnings } from "@/ui/components/admin/claim-warnings";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Switch } from "@/ui/primitives/switch";
import { Textarea } from "@/ui/primitives/textarea";

import { saveSettings } from "./actions";

export const SECTION_LABELS: Record<SettingsSection, string> = {
  brand: "Brand",
  contact: "Contact",
  locations: "Locations",
  social: "Social",
  homepage: "Homepage",
  about: "About page",
  compliance: "Compliance",
  claims: "Claims & wording",
  payments: "Payments & invoices",
  ordering: "Ordering",
  delivery: "Delivery",
  whatsapp: "WhatsApp messages",
};

export type Errors = Record<string, string>;

/* ───────────────────────── shared field helpers ───────────────────────── */

export function Field({
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

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  multiline,
  rows = 3,
  type = "text",
  bannedPhrases,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  type?: string;
  bannedPhrases?: BannedPhrase[];
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {multiline ? (
        <Textarea
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          rows={rows}
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
      {bannedPhrases && <ClaimWarnings text={value} bannedPhrases={bannedPhrases} />}
    </Field>
  );
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function ImageField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("Image is too large (max 8 MB).");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("filename", file.name);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Field label={label} hint={hint} error={error}>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="max-h-24 rounded-md border object-contain" />
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          placeholder="/path or https://…"
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        />
        <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Upload className="mr-1 h-4 w-4" />
          {uploading ? "Uploading…" : "Upload"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.currentTarget.value = "";
          }}
        />
      </div>
    </Field>
  );
}

export function ToggleField({
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

export function ListControls({
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

export function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ───────────────────────── section state hook ───────────────────────── */

export function useSection<K extends SettingsSection>(section: K, initial: SettingsMap[K]) {
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

export function SaveBar({
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

export function SectionCard({
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

export const grid = "grid gap-4 sm:grid-cols-2";
