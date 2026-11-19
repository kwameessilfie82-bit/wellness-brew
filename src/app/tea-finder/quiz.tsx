"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { toCardProduct } from "@/lib/products/card";
import type { TeaFinderSettings } from "@/lib/settings/growth-schemas";
import { track } from "@/lib/tracking/client";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/primitives/button";
import { Progress } from "@/ui/primitives/progress";
import { ProductCard } from "@/ui/product-card";

type Candidate = { card: ReturnType<typeof toCardProduct>; terms: string[]; inStock: boolean };

/** Score = number of chosen terms a product carries; ties keep catalogue order (featured first). */
export function rankCandidates(candidates: Candidate[], chosen: string[], limit = 3): Candidate[] {
  const want = new Set(chosen);
  return candidates
    .map((c, i) => ({ c, i, score: c.terms.filter((t) => want.has(t)).length + (c.inStock ? 0.1 : 0) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.c);
}

export function TeaFinderQuiz({
  questions,
  resultTitle,
  candidates,
}: {
  questions: TeaFinderSettings["questions"];
  resultTitle: string;
  candidates: Candidate[];
}) {
  const [answers, setAnswers] = useState<string[][]>([]);
  const step = answers.length;
  const done = step >= questions.length;
  const results = useMemo(() => (done ? rankCandidates(candidates, answers.flat()) : []), [done, candidates, answers]);

  const choose = (terms: string[]) => {
    const next = [...answers, terms];
    setAnswers(next);
    if (next.length === questions.length) track("tea_finder_complete");
  };

  if (done) {
    return (
      <section aria-live="polite">
        <h2 className="mb-6 font-serif text-2xl font-bold">{resultTitle}</h2>
        {results.length === 0 ? (
          <p className="text-muted-foreground">
            We couldn&apos;t find a match. <Link href="/shop" className="text-primary underline">Browse all teas</Link>.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <ProductCard key={r.card.id} product={r.card} />
            ))}
          </div>
        )}
        <Button variant="outline" className="mt-8" onClick={() => setAnswers([])}>
          <RotateCcw className="mr-2 h-4 w-4" /> Start again
        </Button>
      </section>
    );
  }

  const q = questions[step];
  return (
    <section aria-labelledby="finder-q" className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Question {step + 1} of {questions.length}
        </p>
        <Progress value={(step / questions.length) * 100} />
      </div>
      <h2 id="finder-q" className="font-serif text-2xl font-bold">
        {q.question}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.answers.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => choose(a.terms)}
            className={cn(
              "rounded-2xl border bg-card p-5 text-left text-lg font-medium transition",
              "hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {step > 0 ? (
        <Button variant="ghost" onClick={() => setAnswers(answers.slice(0, -1))}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      ) : null}
    </section>
  );
}
