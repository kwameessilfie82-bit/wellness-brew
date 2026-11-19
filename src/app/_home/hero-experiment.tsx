"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useSiteSettings } from "@/lib/settings/site-settings-context";
import { track } from "@/lib/tracking/client";

type Copy = { titleLead: string; titleHighlight: string; primaryCtaLabel: string };

const KEY = "wb-ab-hero";

/**
 * Homepage headline A/B test (Settings → A/B tests). The page is static, so A
 * is server-rendered and visitors bucketed into B swap after hydration. The
 * bucket is sticky per browser. Views and CTA clicks feed Insights → KPIs.
 */
function useHeroVariant(): "A" | "B" | null {
  const { experiments } = useSiteSettings();
  const hero = experiments.hero;
  const [variant, setVariant] = useState<"A" | "B" | null>(null);
  useEffect(() => {
    if (!hero.enabled) return;
    let v: "A" | "B";
    try {
      const saved = localStorage.getItem(KEY);
      v = saved === "A" || saved === "B" ? saved : Math.random() * 100 < hero.splitPercent ? "B" : "A";
      localStorage.setItem(KEY, v);
    } catch {
      v = "A";
    }
    // Bucket depends on browser storage, so it can only be known after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVariant(v);
    track("hero_view", { variant: v });
  }, [hero.enabled, hero.splitPercent]);
  return hero.enabled ? variant : null;
}

export function HeroHeadline({ a, className, highlightClassName }: { a: Copy; className: string; highlightClassName: string }) {
  const { experiments } = useSiteSettings();
  const variant = useHeroVariant();
  const b = experiments.hero;
  const lead = variant === "B" && b.titleLead ? b.titleLead : a.titleLead;
  const highlight = variant === "B" && (b.titleLead || b.titleHighlight) ? b.titleHighlight : a.titleHighlight;
  return (
    <h1 className={className}>
      {lead}
      {highlight ? (
        <>
          {" "}
          <span className={highlightClassName}>{highlight}</span>
        </>
      ) : null}
    </h1>
  );
}

export function HeroPrimaryCta({ href, label }: { href: string; label: string }) {
  const { experiments } = useSiteSettings();
  const enabled = experiments.hero.enabled;
  const [variant, setVariant] = useState<"A" | "B">("A");
  useEffect(() => {
    if (!enabled) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(KEY) === "B") setVariant("B");
    } catch {
      /* ignore */
    }
  }, [enabled]);
  const text = enabled && variant === "B" && experiments.hero.primaryCtaLabel ? experiments.hero.primaryCtaLabel : label;
  return (
    <Link href={href} onClick={() => enabled && track("hero_cta", { variant })}>
      {text}
    </Link>
  );
}
