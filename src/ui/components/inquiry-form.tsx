"use client";

import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";

import { submitInquiry } from "@/app/inquiry-actions";
import { track } from "@/lib/tracking/client";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Textarea } from "@/ui/primitives/textarea";

export type ExtraField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select";
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
};

/** Lead form for gifting quotes, stockist partnerships and general enquiries. */
export function InquiryForm({
  kind,
  extraFields = [],
  messageLabel = "Tell us more",
  submitLabel = "Send",
  successMessage,
}: {
  kind: "gifting" | "stockist" | "general";
  extraFields?: ExtraField[];
  messageLabel?: string;
  submitLabel?: string;
  successMessage: string;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({ name: "", company: "", phone: "", email: "", message: "", website: "" });
  const [details, setDetails] = useState<Record<string, string>>(
    Object.fromEntries(extraFields.map((f) => [f.key, f.defaultValue ?? ""])),
  );

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
        <p className="font-medium">{successMessage}</p>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const source = (() => {
        try {
          const utm = JSON.parse(sessionStorage.getItem("wb-utm") || "{}") as { source?: string; campaign?: string };
          return [utm.source, utm.campaign].filter(Boolean).join(" / ");
        } catch {
          return "";
        }
      })();
      const res = await submitInquiry({ kind, ...v, details, source });
      if (res.ok) {
        track("generate_lead", { variant: kind });
        setDone(true);
      } else {
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  };

  const field = (key: keyof typeof v, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`iq-${key}`}>{label}</Label>
      <Input id={`iq-${key}`} value={v[key]} onChange={(e) => setV((p) => ({ ...p, [key]: e.target.value }))} {...props} />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("name", "Your name", { autoComplete: "name" })}
        {field("company", kind === "stockist" ? "Business name" : "Company (optional)", { autoComplete: "organization" })}
        {field("phone", "Phone / WhatsApp", { type: "tel", autoComplete: "tel", placeholder: "054 123 4567" })}
        {field("email", "Email (optional)", { type: "email", autoComplete: "email" })}
        {extraFields.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`iq-x-${f.key}`}>{f.label}</Label>
            {f.type === "select" ? (
              <NativeSelect
                id={`iq-x-${f.key}`}
                value={details[f.key]}
                onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
              >
                <NativeSelectOption value="">Choose…</NativeSelectOption>
                {(f.options ?? []).map((o) => (
                  <NativeSelectOption key={o} value={o}>
                    {o}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : (
              <Input
                id={`iq-x-${f.key}`}
                type={f.type ?? "text"}
                inputMode={f.type === "number" ? "numeric" : undefined}
                placeholder={f.placeholder}
                value={details[f.key]}
                onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="iq-message">{messageLabel}</Label>
        <Textarea id="iq-message" rows={4} value={v.message} onChange={(e) => setV((p) => ({ ...p, message: e.target.value }))} />
      </div>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        value={v.website}
        onChange={(e) => setV((p) => ({ ...p, website: e.target.value }))}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" loading={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
