"use client";

import { Tag, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatMoney } from "@/lib/orders/money";
import { readReferral } from "@/lib/tracking/client";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";

import { checkPromoCode } from "./actions";

export type AppliedPromo = { code: string; discount: number; label: string };

/** Optional discount / referral code. The server re-checks it when the order is placed. */
export function PromoField({
  items,
  applied,
  onChange,
  serverError,
}: {
  items: { productId: string; quantity: number }[];
  applied: AppliedPromo | null;
  onChange: (p: AppliedPromo | null) => void;
  serverError?: string | null;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cartKey = JSON.stringify(items);

  const apply = (value: string) =>
    start(async () => {
      setError(null);
      const res = await checkPromoCode(value, JSON.parse(cartKey) as typeof items);
      if (res.ok) onChange({ code: res.code, discount: res.discount, label: res.label });
      else {
        onChange(null);
        setError(res.error);
      }
    });

  // Referral links (?ref=CODE) pre-apply the code once.
  useEffect(() => {
    const ref = readReferral();
    // Applied (or the error shown) asynchronously, after the server check.
    if (ref && !applied) apply(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cart changed after applying: re-check so the discount stays right.
  useEffect(() => {
    if (applied) apply(applied.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/30">
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-emerald-700" aria-hidden />
          <span>
            <span className="font-semibold">{applied.code}</span> · {applied.label} · −{formatMoney(applied.discount)}
          </span>
        </span>
        <Button type="button" size="icon" variant="ghost" aria-label="Remove code" onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="promo">Discount or referral code (optional)</Label>
      <div className="flex gap-2">
        <Input
          id="promo"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (code.trim()) apply(code);
            }
          }}
          autoCapitalize="characters"
          placeholder="e.g. WELCOME10"
        />
        <Button type="button" variant="outline" disabled={!code.trim()} loading={pending} onClick={() => apply(code)}>
          Apply
        </Button>
      </div>
      {error || serverError ? <p className="text-sm text-destructive">{error || serverError}</p> : null}
    </div>
  );
}
