import { Gift, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { formatPrice } from "@/lib/format";
import { fillTemplate } from "@/lib/orders/message";
import { metaDescription } from "@/lib/seo/site";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand, isUnoptimizedImage, whatsappLink } from "@/lib/settings/schemas";
import { PageShell } from "@/ui/components/content-page";
import { InquiryForm } from "@/ui/components/inquiry-form";
import { TrackedAnchor } from "@/ui/components/tracked";
import { Button } from "@/ui/primitives/button";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [g, { brand }] = await Promise.all([getSettings("gifting"), getPublicSettings()]);
  return {
    title: g.title,
    description: metaDescription(fillBrand(g.intro, brand.name)),
    alternates: { canonical: "/gifting" },
    ...(g.enabled ? {} : { robots: { index: false } }),
  };
}

export default async function GiftingPage() {
  const [g, whatsapp, { brand, contact }] = await Promise.all([
    getSettings("gifting"),
    getSettings("whatsapp"),
    getPublicSettings(),
  ]);
  if (!g.enabled) notFound();
  const wa = contact.whatsappNumber || contact.orderPhone;
  const waHref = wa ? whatsappLink(wa, fillTemplate(whatsapp.giftEnquiry, { brand: brand.name })) : null;
  return (
    <PageShell title={g.title} subtitle={<p className="text-lg">{fillBrand(g.intro, brand.name)}</p>}>
      {g.heroImageUrl ? (
        <div className="relative mb-12 aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
          <Image
            src={g.heroImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            unoptimized={isUnoptimizedImage(g.heroImageUrl)}
            priority
          />
        </div>
      ) : null}

      {g.tiers.length > 0 ? (
        <section aria-labelledby="tiers" className="mb-14">
          <h2 id="tiers" className="mb-6 font-serif text-2xl font-bold">
            Gift options
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {g.tiers.map((t) => (
              <article key={t.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card">
                {t.imageUrl ? (
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={t.imageUrl}
                      alt={t.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 384px"
                      unoptimized={isUnoptimizedImage(t.imageUrl)}
                    />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Gift className="h-5 w-5 text-brand" aria-hidden /> {t.name}
                  </h3>
                  {t.contents ? <p className="whitespace-pre-line text-sm text-muted-foreground">{t.contents}</p> : null}
                  <dl className="mt-auto grid grid-cols-2 gap-2 pt-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-semibold">{t.price != null ? `${formatPrice(t.price)} each` : "On request"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Minimum</dt>
                      <dd className="font-semibold">{t.minQty} pieces</dd>
                    </div>
                    {t.leadTime ? (
                      <div>
                        <dt className="text-muted-foreground">Lead time</dt>
                        <dd>{t.leadTime}</dd>
                      </div>
                    ) : null}
                    {t.branding ? (
                      <div>
                        <dt className="text-muted-foreground">Branding</dt>
                        <dd>{t.branding}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="quote" className="rounded-2xl border bg-card p-6 md:p-8">
        <h2 id="quote" className="mb-6 font-serif text-2xl font-bold">
          {g.formTitle || "Request a quote"}
        </h2>
        <InquiryForm
          kind="gifting"
          submitLabel="Request quote"
          successMessage={g.successMessage}
          messageLabel="Anything else? (branding, delivery address, budget)"
          extraFields={[
            ...(g.tiers.length > 0
              ? [{ key: "tier", label: "Gift option", type: "select" as const, options: g.tiers.map((t) => t.name) }]
              : []),
            { key: "quantity", label: "How many?", type: "number" as const, placeholder: "e.g. 50" },
            { key: "neededBy", label: "Needed by", type: "date" as const },
          ]}
        />
        {waHref ? (
          <Button asChild variant="link" className="mt-4 px-0">
            <TrackedAnchor href={waHref} target="_blank" rel="noopener noreferrer" event="whatsapp_click" params={{ variant: "gifting" }}>
              <MessageCircle className="mr-1 h-4 w-4" /> Prefer WhatsApp? Chat with us
            </TrackedAnchor>
          </Button>
        ) : null}
      </section>
    </PageShell>
  );
}
