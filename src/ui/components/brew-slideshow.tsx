"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { isUnoptimizedImage } from "@/lib/settings/schemas";

export type Slide = { url: string; title: string };

const INTERVAL = 5000;

/**
 * Full-bleed crossfading slideshow with a slow zoom ("Ken Burns").
 * Pauses while the tab is hidden; respects reduced-motion (no zoom, slower fades).
 */
export function BrewSlideshow({ slides, className }: { slides: Slide[]; className?: string }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => setActive((i) => (i + 1) % slides.length), INTERVAL);
    };
    const onVisibility = () => (document.hidden ? clearInterval(timer) : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-black", className)}>
      {slides.map((s, i) => (
        <div
          key={s.url}
          aria-hidden={i !== active}
          className={cn(
            "absolute inset-0 transition-opacity duration-[1400ms] ease-in-out motion-reduce:duration-[2000ms]",
            i === active ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={s.url}
            alt={s.title}
            fill
            priority={i === 0}
            sizes="(max-width: 768px) 0vw, 50vw"
            unoptimized={isUnoptimizedImage(s.url)}
            className={cn("object-cover", i === active && "animate-ken-burns motion-reduce:animate-none")}
          />
        </div>
      ))}
      <div className="absolute right-6 top-6 z-10 flex gap-1.5" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={s.url}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={s.title || `Slide ${i + 1}`}
            onClick={() => setActive(i)}
            className={cn(
              "h-1.5 rounded-full bg-white/50 transition-all duration-500 hover:bg-white/80",
              i === active ? "w-6 bg-white" : "w-1.5",
            )}
          />
        ))}
      </div>
      <p
        key={active}
        className="absolute bottom-32 left-8 z-10 animate-fade-in-up text-xs font-medium uppercase tracking-[0.2em] text-white/80"
      >
        {slides[active]?.title}
      </p>
    </div>
  );
}
