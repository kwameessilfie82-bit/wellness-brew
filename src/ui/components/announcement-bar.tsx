"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useSiteSettings } from "@/lib/settings/site-settings-context";

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

/** Site-wide strip from Settings → Announcement & toggles. Dismissible per visit. */
export function AnnouncementBar() {
  const { site } = useSiteSettings();
  const a = site.announcement;
  const pathname = usePathname();
  const key = `wb-announce:${a.text}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const d = today();
    const inWindow = (!a.startsOn || d >= a.startsOn) && (!a.endsOn || d <= a.endsOn);
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(key) === "1";
    } catch {
      /* storage blocked */
    }
    // Date window depends on the visitor's clock, so decide after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHidden(!a.enabled || !a.text || !inWindow || dismissed);
  }, [a.enabled, a.text, a.startsOn, a.endsOn, key]);

  if (hidden || pathname.startsWith("/admin")) return null;
  return (
    <div className="relative bg-primary px-10 py-2 text-center text-sm text-primary-foreground">
      <span>{a.text}</span>
      {a.href && a.linkLabel ? (
        <Link href={a.href} className="ml-2 font-semibold underline underline-offset-4">
          {a.linkLabel}
        </Link>
      ) : null}
      <button
        type="button"
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-80 hover:opacity-100"
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            /* ignore */
          }
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
