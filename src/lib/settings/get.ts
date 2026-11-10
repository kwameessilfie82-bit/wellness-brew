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
  type PublicSettings,
  type SettingsMap,
  type SettingsSection,
} from "./schemas";

export const settingsTag = (section: SettingsSection) => `settings:${section}`;
export const SETTINGS_ALL_TAG = "settings:all";

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
    ["site-settings", section],
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
    const raw = await readRaw(PUBLIC_SECTIONS);
    return Object.fromEntries(
      PUBLIC_SECTIONS.map((k) => [k, resolveSection(k, raw.get(k))]),
    ) as PublicSettings;
  },
  ["site-settings", "public", "v2"],
  { tags: [...PUBLIC_SECTIONS.map(settingsTag), SETTINGS_ALL_TAG] },
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
