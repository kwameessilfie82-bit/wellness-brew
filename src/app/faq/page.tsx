import type { Metadata } from "next";

import { faqLd, JsonLd } from "@/lib/seo/json-ld";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand } from "@/lib/settings/schemas";
import { PageShell } from "@/ui/components/content-page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/ui/primitives/accordion";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const pages = await getSettings("pages");
  return {
    title: pages.faq.title,
    description: pages.faq.intro || "Answers to common questions about ordering, delivery and our teas.",
    alternates: { canonical: "/faq" },
  };
}

export default async function FaqPage() {
  const [pages, { brand }] = await Promise.all([getSettings("pages"), getPublicSettings()]);
  const faq = pages.faq;
  const items = faq.items.map((i) => ({ ...i, question: fillBrand(i.question, brand.name), answer: fillBrand(i.answer, brand.name) }));
  const ld = faqLd(items);
  return (
    <PageShell title={faq.title} subtitle={faq.intro ? <p className="text-lg">{fillBrand(faq.intro, brand.name)}</p> : null}>
      {ld ? <JsonLd data={ld} /> : null}
      <Accordion type="single" collapsible className="w-full">
        {items.map((i) => (
          <AccordionItem key={i.id} value={i.id}>
            <AccordionTrigger className="text-left text-lg">{i.question}</AccordionTrigger>
            <AccordionContent className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">{i.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PageShell>
  );
}
