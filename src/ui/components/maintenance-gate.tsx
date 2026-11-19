"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";

import { useSiteSettings } from "@/lib/settings/site-settings-context";
import { whatsappLink } from "@/lib/settings/schemas";

/** Paths that keep working in maintenance mode (staff, sign-in, live order links). */
const ALWAYS_OPEN = ["/admin", "/auth", "/o/", "/r/", "/api"];

/**
 * Settings → Announcement & toggles → Maintenance mode. Replaces the public
 * storefront with a holding message; staff pages and order links still work.
 */
export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { site, contact, brand } = useSiteSettings();
  const pathname = usePathname();
  const m = site.maintenance;
  if (!m.enabled || ALWAYS_OPEN.some((p) => pathname.startsWith(p))) return <>{children}</>;
  const wa = contact.whatsappNumber || contact.orderPhone;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{brand.name}</p>
      <h1 className="font-serif text-4xl font-bold">{m.title}</h1>
      <p className="max-w-md text-muted-foreground">{m.message}</p>
      {wa ? (
        <a
          href={whatsappLink(wa, `Hello ${brand.name}, I'd like to place an order.`)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
        >
          <MessageCircle className="h-5 w-5" /> Order on WhatsApp
        </a>
      ) : null}
    </main>
  );
}
