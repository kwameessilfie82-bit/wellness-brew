import { Clock, Droplets, Leaf, Package, Star, Thermometer } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { pricePerServing, type ProductDetails } from "@/lib/products/details";
import type { PublicReview } from "@/lib/reviews/server";
import type { TaxonomySettings } from "@/lib/settings/growth-schemas";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/ui/primitives/accordion";

const BREW_STYLE_LABEL = { hot: "Hot", iced: "Iced", both: "Hot or iced" } as const;

export function termLabels(details: ProductDetails, taxonomy: TaxonomySettings): string[] {
  const all = [...taxonomy.flavours, ...taxonomy.formats, ...taxonomy.occasions];
  return details.terms.map((id) => all.find((t) => t.id === id)?.label).filter(Boolean) as string[];
}

export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${className} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} aria-hidden />
      ))}
    </span>
  );
}

/** Price per bag, brewing quick facts and taxonomy chips, shown next to the buy button. */
export function ProductQuickFacts({
  price,
  details,
  terms,
}: {
  price: number;
  details: ProductDetails;
  terms: string[];
}) {
  const perServing = pricePerServing(price, details);
  const b = details.brewing;
  const facts = [
    b.tempC ? { icon: Thermometer, label: `${b.tempC}°C` } : null,
    b.minutes ? { icon: Clock, label: `${b.minutes} min` } : null,
    b.waterMl ? { icon: Droplets, label: `${b.waterMl} ml` } : null,
    b.style ? { icon: Leaf, label: BREW_STYLE_LABEL[b.style] } : null,
    details.netWeight ? { icon: Package, label: details.netWeight } : null,
  ].filter(Boolean) as { icon: typeof Clock; label: string }[];
  if (!perServing && facts.length === 0 && terms.length === 0) return null;
  return (
    <div className="space-y-3">
      {perServing ? (
        <p className="text-sm text-muted-foreground">
          {formatPrice(perServing)} per {details.servingSize || "bag"} · {details.servingsPerPack} in a pack
        </p>
      ) : null}
      {facts.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Brewing at a glance">
          {facts.map((f) => (
            <li key={f.label} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <f.icon className="h-4 w-4 text-brand" aria-hidden />
              {f.label}
            </li>
          ))}
        </ul>
      ) : null}
      {terms.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Tags">
          {terms.map((t) => (
            <li key={t} className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
              {t}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Ingredients, tasting notes, brewing, storage, cautions and FAQ as an accordion. */
export function ProductDetailSections({ details }: { details: ProductDetails }) {
  const b = details.brewing;
  const brewing =
    b.instructions ||
    [b.waterMl && `${b.waterMl} ml water`, b.tempC && `at ${b.tempC}°C`, b.minutes && `steep ${b.minutes} min`]
      .filter(Boolean)
      .join(", ");
  const sections = [
    { id: "ingredients", title: "Ingredients", body: details.ingredients },
    { id: "tasting", title: "Tasting notes", body: details.tastingNotes },
    { id: "brewing", title: "How to brew", body: brewing },
    {
      id: "storage",
      title: "Storage & shelf life",
      body: [details.storage, details.shelfLife && `Shelf life: ${details.shelfLife}`].filter(Boolean).join("\n"),
    },
    { id: "cautions", title: "Cautions", body: details.cautions },
  ].filter((s) => s.body);

  if (sections.length === 0 && details.faq.length === 0) return null;
  return (
    <section className="mt-16 grid gap-10 lg:grid-cols-2" aria-label="Product details">
      {sections.length > 0 ? (
        <div>
          <h2 className="mb-4 font-serif text-2xl font-bold text-heading">About this tea</h2>
          <Accordion type="multiple" defaultValue={["ingredients", "brewing"]}>
            {sections.map((s) => (
              <AccordionItem key={s.id} value={s.id}>
                <AccordionTrigger className="text-base">{s.title}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-muted-foreground">{s.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : null}
      {details.faq.length > 0 ? (
        <div>
          <h2 className="mb-4 font-serif text-2xl font-bold text-heading">Questions</h2>
          <Accordion type="single" collapsible>
            {details.faq.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left text-base">{f.question}</AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-muted-foreground">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : null}
    </section>
  );
}

export function ReviewList({ reviews, average, count }: { reviews: PublicReview[]; average: number; count: number }) {
  return (
    <div className="space-y-6">
      {count > 0 ? (
        <div className="flex items-center gap-3">
          <Stars value={average} className="h-5 w-5" />
          <span className="font-semibold">{average.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">
            from {count} review{count === 1 ? "" : "s"}
          </span>
        </div>
      ) : (
        <p className="text-muted-foreground">No reviews yet. Be the first!</p>
      )}
      <ul className="space-y-5">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars value={r.rating} />
              <time className="text-xs text-muted-foreground" dateTime={r.date}>
                {new Date(r.date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </div>
            {r.title ? <p className="mt-2 font-semibold">{r.title}</p> : null}
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            <p className="mt-2 text-xs font-medium">
              {r.name}
              {r.location ? `, ${r.location}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
