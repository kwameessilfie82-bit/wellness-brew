/** Money helpers (client + server safe). Amounts are GHS numbers rounded to pesewas. */

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** "GHS 80" / "GHS 80.50" — short form for WhatsApp messages and the order page. */
export function formatMoney(n: number, currency = "GHS"): string {
  const v = round2(n);
  return `${currency} ${Number.isInteger(v) ? v.toLocaleString("en-GH") : v.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
