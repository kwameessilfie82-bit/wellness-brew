"use client";

import { useMemo } from "react";

import { findBannedPhrases } from "@/lib/compliance/claims";
import type { BannedPhrase } from "@/lib/settings/schemas";

/** Amber, non-blocking warnings for banned phrases found in `text`. */
export function ClaimWarnings({
  text,
  bannedPhrases,
}: {
  text: string;
  bannedPhrases?: BannedPhrase[];
}) {
  const hits = useMemo(
    () => (bannedPhrases && bannedPhrases.length > 0 ? findBannedPhrases(text, bannedPhrases) : []),
    [text, bannedPhrases],
  );
  if (hits.length === 0) return null;
  return (
    <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-400" role="status">
      {hits.map((h) => (
        <li key={h.phrase}>
          ⚠ &ldquo;{h.match}&rdquo;{h.reason ? ` — ${h.reason}` : ""}
          {h.suggestion ? <span className="ml-1 font-medium">Try: {h.suggestion}</span> : null}
        </li>
      ))}
    </ul>
  );
}
