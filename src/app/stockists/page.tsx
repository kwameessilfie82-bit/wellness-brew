import { ExternalLink, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { metaDescription } from "@/lib/seo/site";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand, telLink } from "@/lib/settings/schemas";
import { PageShell } from "@/ui/components/content-page";
import { InquiryForm } from "@/ui/components/inquiry-form";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [s, { brand }] = await Promise.all([getSettings("stockists"), getPublicSettings()]);
  return {
    title: s.title,
    description: metaDescription(fillBrand(s.intro, brand.name)),
    alternates: { canonical: "/stockists" },
    ...(s.enabled ? {} : { robots: { index: false } }),
  };
}

const BUSINESS_TYPES = ["Shop / supermarket", "Pharmacy", "Café / restaurant", "Hotel", "Online store", "Other"];

export default async function StockistsPage() {
  const [s, { brand }] = await Promise.all([getSettings("stockists"), getPublicSettings()]);
  if (!s.enabled) notFound();
  const items = s.items.filter((i) => i.isPublic);
  const areas = [...new Set(items.map((i) => i.area || "Other"))];
  return (
    <PageShell title={s.title} subtitle={<p className="text-lg">{fillBrand(s.intro, brand.name)}</p>}>
      {items.length === 0 ? (
        <p className="mb-12 rounded-xl border bg-muted/40 p-5 text-muted-foreground">
          New shops are coming soon. Meanwhile, order online and we will deliver.
        </p>
      ) : (
        <div className="mb-14 space-y-10">
          {areas.map((area) => (
            <section key={area} aria-label={area}>
              <h2 className="mb-4 font-serif text-xl font-semibold">{area}</h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {items
                  .filter((i) => (i.area || "Other") === area)
                  .map((i) => (
                    <li key={i.id} className="rounded-xl border bg-card p-4">
                      <p className="font-semibold">{i.name}</p>
                      {i.address ? (
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {i.address}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        {i.mapUrl ? (
                          <a href={i.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <MapPin className="h-4 w-4" aria-hidden /> Map
                          </a>
                        ) : null}
                        {i.phone ? (
                          <a href={telLink(i.phone)} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Phone className="h-4 w-4" aria-hidden /> {i.phone}
                          </a>
                        ) : null}
                        {i.url ? (
                          <a href={i.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="h-4 w-4" aria-hidden /> Website
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <section aria-labelledby="partner" className="rounded-2xl border bg-card p-6 md:p-8">
        <h2 id="partner" className="mb-2 font-serif text-2xl font-bold">
          {s.partnerTitle || "Stock our teas"}
        </h2>
        {s.partnerIntro ? <p className="mb-6 text-muted-foreground">{fillBrand(s.partnerIntro, brand.name)}</p> : null}
        <InquiryForm
          kind="stockist"
          submitLabel="Send"
          successMessage="Thank you! We will be in touch with wholesale details."
          messageLabel="Tell us about your shop"
          extraFields={[
            { key: "businessType", label: "Type of business", type: "select", options: BUSINESS_TYPES },
            { key: "location", label: "Town / area", placeholder: "e.g. East Legon, Accra" },
          ]}
        />
      </section>
    </PageShell>
  );
}
