import "server-only";

/**
 * Server-side settings reads. Every section is cached under the tag
 * `settings:<section>` and invalidated by the save action, so page views
 * never hit the database for settings.
 *
 * Failure handling: the cached function throws on DB errors (unstable_cache
 * does not store rejections), and the wrapper falls back to defaults for that
 * one request. A transient outage therefore never pins defaults in the cache.
 */
import { inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { siteSettingTable } from "@/db/schema";

import { resolveSection, SETTINGS_DEFAULTS, SETTINGS_SECTIONS } from "./registry";
import {
  PUBLIC_DEFAULTS,
  PUBLIC_SECTIONS,
  pickPublicPayment,
  type PublicSettings,
  type SettingsMap,
  type SettingsSection,
} from "./schemas";

/** Sections whose `enabled` flag is exposed publicly as `features`. */
const FEATURE_SECTIONS = ["gifting", "teaFinder", "stockists"] as const satisfies readonly SettingsSection[];

export const settingsTag = (section: SettingsSection) => `settings:${section}`;
export const SETTINGS_ALL_TAG = "settings:all";
/** Bump when a settings schema changes shape so old cached values (which may
 *  lack new fields) are never served — the data cache outlives deploys. */
const SETTINGS_CACHE_VERSION = "v7";

async function readRaw(sections: readonly SettingsSection[]) {
  const rows = await db
    .select({ key: siteSettingTable.key, value: siteSettingTable.value })
    .from(siteSettingTable)
    .where(inArray(siteSettingTable.key, [...sections]));
  return new Map<string, unknown>(rows.map((r) => [r.key, r.value]));
}

const cachedSection = <K extends SettingsSection>(section: K) =>
  unstable_cache(
    async () => resolveSection(section, (await readRaw([section])).get(section)),
    ["site-settings", SETTINGS_CACHE_VERSION, section],
    { tags: [settingsTag(section), SETTINGS_ALL_TAG] },
  );

export async function getSettings<K extends SettingsSection>(section: K): Promise<SettingsMap[K]> {
  try {
    return await cachedSection(section)();
  } catch (error) {
    console.error(`[settings] read "${section}" failed, using defaults for this request:`, error);
    return SETTINGS_DEFAULTS[section];
  }
}

const cachedPublic = unstable_cache(
  async (): Promise<PublicSettings> => {
    const raw = await readRaw([...PUBLIC_SECTIONS, ...FEATURE_SECTIONS, "payments"]);
    const sections = Object.fromEntries(PUBLIC_SECTIONS.map((k) => [k, resolveSection(k, raw.get(k))]));
    // Hidden locations (e.g. a private correspondence address) stay server-side.
    const locations = sections.locations as SettingsMap["locations"];
    sections.locations = { ...locations, items: locations.items.filter((l) => l.isPublic) };
    const features = {
      gifting: resolveSection("gifting", raw.get("gifting")).enabled,
      teaFinder: resolveSection("teaFinder", raw.get("teaFinder")).enabled,
      stockists: resolveSection("stockists", raw.get("stockists")).enabled,
    };
    // Only the MoMo number/provider/name leave the server; bank details stay private.
    return {
      ...sections,
      features,
      payment: pickPublicPayment(resolveSection("payments", raw.get("payments"))),
    } as PublicSettings;
  },
  ["site-settings", "public", SETTINGS_CACHE_VERSION],
  { tags: [...PUBLIC_SECTIONS.map(settingsTag), ...FEATURE_SECTIONS.map(settingsTag), settingsTag("payments"), SETTINGS_ALL_TAG] },
);

/** All public sections in one query, for the root layout. */
export async function getPublicSettings(): Promise<PublicSettings> {
  try {
    return await cachedPublic();
  } catch (error) {
    console.error("[settings] public read failed, using defaults for this request:", error);
    return PUBLIC_DEFAULTS;
  }
}

/** Uncached read of every section, for the settings editor (errors propagate). */
export async function getAllSettingsUncached(): Promise<SettingsMap> {
  const raw = await readRaw(SETTINGS_SECTIONS);
  return Object.fromEntries(
    SETTINGS_SECTIONS.map((k) => [k, resolveSection(k, raw.get(k))]),
  ) as SettingsMap;
}
