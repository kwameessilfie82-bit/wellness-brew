/**
 * Promotion maths (client + server safe, pure). Amounts in GHS; arithmetic in
 * pesewas via the money helpers so totals never drift.
 */
import { fromMinor, toMinor } from "@/lib/orders/money";

export const PROMO_KINDS = ["discount", "referral", "bundle"] as const;
export type PromoKind = (typeof PROMO_KINDS)[number];
export const DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export type PromoRule = {
  code: string;
  kind: PromoKind;
  discountType: DiscountType;
  value: number;
  minSubtotal: number;
  bundleProductIds: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  uses: number;
  isActive: boolean;
};

export type PromoLine = { productId: string; price: number; quantity: number };

export type PromoOutcome =
  | { ok: true; discount: number; label: string }
  | { ok: false; reason: string };

/** Codes are case-insensitive and stored upper-case. */
export const normalizeCode = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, "");

export function describePromo(p: Pick<PromoRule, "discountType" | "value" | "kind">): string {
  const amount = p.discountType === "percent" ? `${p.value}% off` : `GHS ${p.value} off`;
  return p.kind === "bundle" ? `Bundle: ${amount}` : amount;
}

export function computePromo(rule: PromoRule, lines: readonly PromoLine[], now = new Date()): PromoOutcome {
  if (!rule.isActive) return { ok: false, reason: "This code is not active." };
  if (rule.startsAt && now < rule.startsAt) return { ok: false, reason: "This code isn't valid yet." };
  if (rule.endsAt && now > rule.endsAt) return { ok: false, reason: "This code has expired." };
  if (rule.maxUses !== null && rule.uses >= rule.maxUses) return { ok: false, reason: "This code has been fully used." };

  const subtotalMinor = lines.reduce((s, l) => s + toMinor(l.price) * l.quantity, 0);
  if (subtotalMinor <= 0) return { ok: false, reason: "Your cart is empty." };
  if (subtotalMinor < toMinor(rule.minSubtotal)) {
    return { ok: false, reason: `Spend at least GHS ${rule.minSubtotal} to use this code.` };
  }

  // The amount the discount applies to: the whole cart, or the bundle items.
  let baseMinor = subtotalMinor;
  if (rule.kind === "bundle") {
    if (rule.bundleProductIds.length === 0) return { ok: false, reason: "This bundle has no products." };
    const missing = rule.bundleProductIds.filter((id) => !lines.some((l) => l.productId === id && l.quantity > 0));
    if (missing.length > 0) return { ok: false, reason: "Add every tea in the bundle to your cart to use this code." };
    // One of each bundle item.
    baseMinor = rule.bundleProductIds.reduce((s, id) => s + toMinor(lines.find((l) => l.productId === id)!.price), 0);
  }

  let discountMinor =
    rule.discountType === "percent"
      ? Math.round((baseMinor * Math.min(100, Math.max(0, rule.value))) / 100)
      : toMinor(rule.value);
  discountMinor = Math.max(0, Math.min(discountMinor, baseMinor, subtotalMinor));
  if (discountMinor === 0) return { ok: false, reason: "This code gives no discount on your cart." };
  return { ok: true, discount: fromMinor(discountMinor), label: describePromo(rule) };
}

/** subtotal − discount (never below 0) + delivery fee, exact to the pesewa. */
export function orderTotal(subtotal: number, discount: number, deliveryFee: number): number {
  const sub = toMinor(subtotal);
  const disc = Math.min(Math.max(0, toMinor(discount)), sub);
  return fromMinor(sub - disc + toMinor(deliveryFee));
}
