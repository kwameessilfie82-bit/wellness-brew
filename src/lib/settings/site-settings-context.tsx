"use client";

import { createContext, useContext } from "react";

import { PUBLIC_DEFAULTS, type PublicSettings } from "./schemas";

const SiteSettingsContext = createContext<PublicSettings>(PUBLIC_DEFAULTS);

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: PublicSettings;
  children: React.ReactNode;
}) {
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

/** Brand, contact, locations and social settings in client components. */
export function useSiteSettings(): PublicSettings {
  return useContext(SiteSettingsContext);
}
