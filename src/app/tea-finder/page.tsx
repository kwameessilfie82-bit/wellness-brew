import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { toCardProduct } from "@/lib/products/card";
import { getFinderProducts } from "@/lib/products/server";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand } from "@/lib/settings/schemas";
import { PageShell } from "@/ui/components/content-page";

import { TeaFinderQuiz } from "./quiz";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const f = await getSettings("teaFinder");
  return {
    title: f.title,
    description: f.intro || "Answer a few quick questions and we'll match you with a hibiscus blend.",
    alternates: { canonical: "/tea-finder" },
    ...(f.enabled ? {} : { robots: { index: false } }),
  };
}

export default async function TeaFinderPage() {
  const [finder, products, { brand }] = await Promise.all([
    getSettings("teaFinder"),
    getFinderProducts().catch(() => []),
    getPublicSettings(),
  ]);
  if (!finder.enabled || finder.questions.length === 0) notFound();
  const candidates = products.map((p) => ({ card: toCardProduct(p), terms: p.details.terms, inStock: p.quantityAvailable > 0 }));
  return (
    <PageShell title={finder.title} subtitle={finder.intro ? <p className="text-lg">{fillBrand(finder.intro, brand.name)}</p> : null}>
      <TeaFinderQuiz questions={finder.questions} resultTitle={finder.resultTitle || "Your matches"} candidates={candidates} />
    </PageShell>
  );
}
