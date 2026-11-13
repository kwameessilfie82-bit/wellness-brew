"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import type { HeroLayout } from "./pour-scene";

const PourScene = dynamic(() => import("./pour-scene"), { ssr: false });

const BG_LIGHT = "/hero/bg-canopy.webp";
const BG_DARK = "/hero/bg-canopy.webp";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Hero: copy (server-rendered children) + a full-bleed 3D layer. On load the
 * blend ingredients fly in from off-screen and settle around the edges, then a
 * glass teapot pours into a cup inside the stage box. Normal height, no scroll
 * pinning — products sit right below. The WebGL chunk loads after the browser
 * is idle so the headline stays the LCP element. Reduced-motion / no-WebGL
 * users get the static `fallback`.
 */
export function PourHero({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const layout = useRef<HeroLayout>({ cx: 0.75, cy: 0.5, bw: 0.45, bh: 0.7, mobile: false });
  const [reduced, setReduced] = useState(false);
  const [noWebGL, setNoWebGL] = useState(false);
  const [load3d, setLoad3d] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [replay, setReplay] = useState(0);
  const { resolvedTheme } = useTheme();
  const animated = !reduced && !noWebGL;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced) return;
    if (!hasWebGL()) {
      setNoWebGL(true);
      return;
    }
    const ric = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = ric(() => setLoad3d(true), { timeout: 1500 });
    return () => cancel(id);
  }, [reduced]);

  // Track where the stage box sits inside the hero so the scene can place the
  // teapot there while ingredients use the whole hero.
  useEffect(() => {
    const s = section.current;
    const b = box.current;
    if (!s || !b || !animated) return;
    const update = () => {
      const sr = s.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      layout.current = {
        cx: (br.left + br.width / 2 - sr.left) / sr.width,
        cy: (br.top + br.height / 2 - sr.top) / sr.height,
        bw: br.width / sr.width,
        bh: br.height / sr.height,
        mobile: sr.width < 768,
      };
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(s);
    ro.observe(b);
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(s);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [animated]);

  return (
    <section
      ref={section}
      className="relative overflow-hidden bg-background pb-10 pt-6 text-foreground md:pb-20 md:pt-24"
    >
      {/* Faint tropical canopy behind everything. Light: a soft green wash on cream.
          Dark: the same photo, deeper, reading as night forest. Swap BG_DARK for a
          dedicated (licensed) dark image when one is available. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src={BG_LIGHT}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn("object-cover opacity-[0.16] saturate-[0.85]", BG_DARK !== BG_LIGHT && "dark:hidden", "dark:opacity-[0.22]")}
        />
        {BG_DARK !== BG_LIGHT ? (
          <Image
            src={BG_DARK}
            alt=""
            fill
            priority
              sizes="100vw"
            className="hidden object-cover opacity-[0.22] dark:block"
          />
        ) : null}
        {/* Keep the copy column calm so the headline always reads cleanly. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_25%_55%,var(--background)_0%,transparent_100%)] opacity-70" />
      </div>
      <div className="hero-glow" aria-hidden />
      <div className="hero-bottom-blend" aria-hidden />

      {animated ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[3] transition-opacity duration-[1600ms]",
            ready ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        >
          {load3d ? (
            <PourScene
              active={inView}
              replay={replay}
              layout={layout}
              theme={resolvedTheme === "dark" ? "dark" : "light"}
              onReady={() => setReady(true)}
            />
          ) : null}
        </div>
      ) : null}

      {/* minmax(0,…) stops intrinsic widths from widening the column past the screen. */}
      <div className="section-container relative z-10 grid grid-cols-[minmax(0,1fr)] items-center gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
        <div className="order-2 min-w-0 md:order-1 md:max-w-2xl">{children}</div>
        <div className="relative order-1 min-w-0 md:order-2">
          {/* Warm tea-coloured glow behind the stage. */}
          <div
            className="pointer-events-none absolute inset-x-[-10%] inset-y-0 -z-10 bg-[radial-gradient(closest-side,rgba(190,40,70,0.16),transparent)] blur-2xl dark:bg-[radial-gradient(closest-side,rgba(155,27,48,0.35),transparent)]"
            aria-hidden
          />
          {animated ? (
            // Empty stage: the full-bleed canvas draws the teapot here. Click to pour again.
            <div
              ref={box}
              onClick={() => setReplay((n) => n + 1)}
              className="relative h-[min(42svh,340px)] w-full cursor-pointer sm:h-[420px] md:h-[600px] lg:h-[640px]"
              title="Pour again"
              aria-hidden
            />
          ) : (
            fallback
          )}
        </div>
      </div>
    </section>
  );
}
