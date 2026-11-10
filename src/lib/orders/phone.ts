/**
 * Phone helpers (client + server safe). Default country: Ghana (+233).
 * Accepts 054 073 4749, 0540734749, +233 54 073 4749, 233540734749, 00233…
 */

/** Normalise to E.164 (+233XXXXXXXXX). Returns null when it can't be a valid number. */
export function normalizePhone(raw: string, defaultCountry = "233"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (digits.startsWith("+")) {
    digits = digits.slice(1).replace(/\D/g, "");
  } else {
    digits = digits.replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `${defaultCountry}${digits.slice(1)}`;
    else if (!digits.startsWith(defaultCountry) && digits.length === 9) digits = `${defaultCountry}${digits}`;
  }
  // Ghana: 233 + 9 digits. Other countries: E.164 allows 8–15 digits total.
  if (digits.startsWith("233")) {
    if (digits.length !== 12) return null;
  } else if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  return `+${digits}`;
}

/** "+233540734749" -> "+233 •• ••• 4749" */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.length < 6) return "••••";
  return `${d.startsWith("233") ? "+233 " : "+"}•• ••• ${d.slice(-4)}`;
}

/** "+233540734749" -> "054 073 4749" for display to Ghanaian staff. */
export function formatLocalPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.startsWith("233") && d.length === 12) {
    const local = `0${d.slice(3)}`;
    return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return e164;
}

/** wa.me digits from an E.164 number. */
export function waDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
