"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useState, useTransition } from "react";

import { submitReview } from "@/app/review/actions";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/primitives/button";
import { Checkbox } from "@/ui/primitives/checkbox";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { Textarea } from "@/ui/primitives/textarea";

type Props = {
  /** Fixed product (product page) or a list to choose from (/review page). */
  productId?: string;
  products?: { id: string; name: string }[];
  orderNumber?: string;
  brandName: string;
};

export function ReviewForm({ productId, products, orderNumber = "", brandName }: Props) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({
    productId: productId ?? "",
    name: "",
    location: "",
    rating: 0,
    title: "",
    body: "",
    consent: false,
    website: "",
  });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((p) => ({ ...p, [k]: x }));

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-5">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <p className="font-semibold">Thank you for your review!</p>
          <p className="text-sm text-muted-foreground">We check every review before it appears on the site.</p>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitReview({ ...v, orderNumber });
      if (res.ok) setDone(true);
      else {
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {products && (
        <div className="space-y-1.5">
          <Label htmlFor="rv-product">Which tea?</Label>
          <NativeSelect id="rv-product" value={v.productId} onChange={(e) => set("productId", e.target.value)}>
            <NativeSelectOption value="">Choose a tea</NativeSelectOption>
            {products.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.productId && <p className="text-xs text-destructive">{errors.productId}</p>}
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Your rating</Label>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={v.rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => set("rating", n)}
              className="rounded p-1 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Star className={cn("h-7 w-7", n <= v.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
        {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rv-name">Name</Label>
          <Input id="rv-name" value={v.name} onChange={(e) => set("name", e.target.value)} autoComplete="given-name" />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rv-location">Town (optional)</Label>
          <Input id="rv-location" value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Accra" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rv-title">Headline (optional)</Label>
        <Input id="rv-title" value={v.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rv-body">Your review</Label>
        <Textarea id="rv-body" rows={4} value={v.body} onChange={(e) => set("body", e.target.value)} placeholder="How does it taste? How do you drink it?" />
        {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
      </div>
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        value={v.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={v.consent} onCheckedChange={(c) => set("consent", c === true)} className="mt-0.5" />
        <span>
          I agree that {brandName} may publish this review with my first name and town on its website and social media.
        </span>
      </label>
      {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={pending}>
        Submit review
      </Button>
    </form>
  );
}
