/**
 * Banned-phrase detection for owner-written copy (client + server safe).
 * Matches whole words, case-insensitive, with common English suffixes:
 * "heal" flags heal/heals/healing/healed/healer but not "health".
 */
import type { BannedPhrase } from "@/lib/settings/schemas";

export type ClaimHit = {
  phrase: string;
  reason: string;
  suggestion: string;
  match: string;
  excerpt: string;
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cache = new WeakMap<readonly BannedPhrase[], { re: RegExp; p: BannedPhrase }[]>();

function compile(phrases: readonly BannedPhrase[]) {
  let compiled = cache.get(phrases);
  if (!compiled) {
    compiled = phrases
      .filter((p) => p.phrase.trim())
      .map((p) => {
        const body = escape(p.phrase.trim()).replace(/\s+/g, "[\\s-]+");
        // Lookarounds instead of \b so phrases that start/end with "%" or "-" still work.
        return { p, re: new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:s|es|ed|d|ing|er|ers)?(?![\\p{L}\\p{N}])`, "iu") };
      });
    cache.set(phrases, compiled);
  }
  return compiled;
}

export function findBannedPhrases(text: string, phrases: readonly BannedPhrase[]): ClaimHit[] {
  if (!text) return [];
  const hits: ClaimHit[] = [];
  for (const { p, re } of compile(phrases)) {
    const m = re.exec(text);
    if (!m) continue;
    const start = Math.max(0, m.index - 40);
    const end = Math.min(text.length, m.index + m[0].length + 40);
    hits.push({
      phrase: p.phrase,
      reason: p.reason,
      suggestion: p.suggestion,
      match: m[0],
      excerpt: `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`,
    });
  }
  return hits;
}

/** Every string value inside a settings object, with its dotted path. */
export function collectStrings(value: unknown, path = ""): { path: string; text: string }[] {
  if (typeof value === "string") return value ? [{ path, text: value }] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => collectStrings(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      k === "id" || /url|href/i.test(k) ? [] : collectStrings(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}
