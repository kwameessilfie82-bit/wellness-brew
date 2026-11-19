"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/ui/primitives/button";

type ErrorStateProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  homeHref?: string;
  homeLabel?: string;
};

export function ErrorState({
  error,
  reset,
  title = "Something went wrong",
  description = "We hit an unexpected problem. Please try again, and if it keeps happening, come back in a little while.",
  homeHref = "/",
  homeLabel = "Back to home",
}: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 font-serif text-3xl font-bold text-foreground md:text-4xl">{title}</h1>
      <p className="mb-8 max-w-md text-muted-foreground">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href={homeHref}>{homeLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
