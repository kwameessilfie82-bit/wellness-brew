"use server";

import { db } from "@/db";
import { categoryTable, productTable } from "@/db/schema";
import { hasPermission, isAdmin } from "@/lib/admin-auth";
import { collectStrings, findBannedPhrases } from "@/lib/compliance/claims";
import { getAllSettingsUncached } from "@/lib/settings/get";
import type { SettingsSection } from "@/lib/settings/schemas";

export interface ClaimScanHit {
  /** Where the text lives, e.g. "Product: Hibiscus Mint" or "Homepage". */
  where: string;
  field: string;
  phrase: string;
  reason: string;
  suggestion: string;
  excerpt: string;
  editHref: string;
}

// Compliance holds the disclaimer itself ("not intended to … cure …"); claims holds the list.
const SCANNED_SECTIONS: { key: SettingsSection; label: string }[] = [
  { key: "brand", label: "Brand" },
  { key: "homepage", label: "Homepage" },
  { key: "about", label: "About page" },
  { key: "locations", label: "Locations" },
];

/** Scan products, categories and page copy for phrases in the banned list. */
export async function scanClaims(): Promise<
  { ok: true; hits: ClaimScanHit[]; scanned: number } | { ok: false; error: string }
> {
  const adminUser = await isAdmin();
  if (!adminUser || !hasPermission(adminUser, "canManageSettings")) {
    return { ok: false, error: "Not allowed" };
  }

  const [settings, products, categories] = await Promise.all([
    getAllSettingsUncached(),
    db
      .select({
        id: productTable.id,
        name: productTable.name,
        description: productTable.description,
        shortDescription: productTable.shortDescription,
        seoTitle: productTable.seoTitle,
        seoDescription: productTable.seoDescription,
      })
      .from(productTable),
    db
      .select({ id: categoryTable.id, name: categoryTable.name, description: categoryTable.description })
      .from(categoryTable),
  ]);
  const phrases = settings.claims.bannedPhrases;
  const hits: ClaimScanHit[] = [];
  let scanned = 0;

  const check = (where: string, field: string, text: string | null, editHref: string) => {
    if (!text) return;
    scanned++;
    for (const h of findBannedPhrases(text, phrases)) {
      hits.push({ where, field, editHref, phrase: h.phrase, reason: h.reason, suggestion: h.suggestion, excerpt: h.excerpt });
    }
  };

  for (const p of products) {
    const where = `Product: ${p.name.trim()}`;
    const href = "/admin/inventory";
    check(where, "Name", p.name, href);
    check(where, "Description", p.description, href);
    check(where, "Short description", p.shortDescription, href);
    check(where, "SEO title", p.seoTitle, href);
    check(where, "SEO description", p.seoDescription, href);
  }
  for (const c of categories) {
    const where = `Category: ${c.name.trim()}`;
    check(where, "Name", c.name, "/admin/categories");
    check(where, "Description", c.description, "/admin/categories");
  }
  for (const { key, label } of SCANNED_SECTIONS) {
    for (const { path, text } of collectStrings(settings[key])) {
      check(label, path, text, `/admin/settings?tab=${key}`);
    }
  }

  return { ok: true, hits, scanned };
}
