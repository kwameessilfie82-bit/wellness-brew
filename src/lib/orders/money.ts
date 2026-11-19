/** Money helpers (client + server safe). Amounts are GHS numbers rounded to pesewas. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

/*
 * All arithmetic happens in integer pesewas (minor units) and converts back
 * once, so binary-float drift (0.1 + 0.2 = 0.30000000000000004) can never
 * leak into totals or paid/total comparisons. DB columns are numeric(…,2).
 */

/** GHS → integer pesewas. */
export const toMinor = (n: number): number => Math.round(n * 100);

/** Integer pesewas → GHS. */
export const fromMinor = (minor: number): number => minor / 100;

/** Exact sum of GHS amounts. */
export const addMoney = (...amounts: number[]): number =>
  fromMinor(amounts.reduce((sum, n) => sum + toMinor(n), 0));

/** Exact a − b in GHS. */
export const subtractMoney = (a: number, b: number): number => fromMinor(toMinor(a) - toMinor(b));

/** Exact price × quantity. */
export const lineTotal = (price: number, quantity: number): number =>
  fromMinor(toMinor(price) * quantity);

/** Exact Σ price × quantity. */
export const sumLines = (lines: readonly { price: number; quantity: number }[]): number =>
  fromMinor(lines.reduce((sum, l) => sum + toMinor(l.price) * l.quantity, 0));

/** Compares two GHS amounts to the pesewa: negative, 0 or positive. */
export const compareMoney = (a: number, b: number): number => toMinor(a) - toMinor(b);

/** Payment status implied by what's been paid against the total. */
export function paidStatus(paid: number, total: number): "unpaid" | "partially_paid" | "paid" {
  if (toMinor(paid) <= 0) return "unpaid";
  return compareMoney(paid, total) >= 0 ? "paid" : "partially_paid";
}

/** "GHS 80" / "GHS 80.50" — short form for WhatsApp messages and the order page. */
export function formatMoney(n: number, currency = "GHS"): string {
  const v = round2(n);
  return `${currency} ${Number.isInteger(v) ? v.toLocaleString("en-GH") : v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
