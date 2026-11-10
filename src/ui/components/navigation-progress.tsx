"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Thin top progress bar for client-side navigations, so clicking a link never
 * looks like nothing happened while the next page loads. Starts on clicks of
 * same-origin links (and on `nav:start` events for programmatic navigation),
 * finishes when the URL changes.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const start = () => {
      clear();
      // Small delay: instant (prefetched) navigations don't flash a bar.
      timers.current.push(setTimeout(() => setState("loading"), 120));
      // Safety: never leave the bar stuck (e.g. navigation cancelled).
      timers.current.push(setTimeout(() => setState("idle"), 15000));
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    };

    document.addEventListener("click", onClick);
    window.addEventListener("nav:start", start);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("nav:start", start);
      clear();
    };
  }, []);

  // URL changed → finish the bar.
  useEffect(() => {
    clear();
    setState((s) => (s === "idle" ? s : "done"));
    timers.current.push(setTimeout(() => setState("idle"), 300));
  }, [pathname, searchParams]);

  if (state === "idle") return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_var(--color-primary)] transition-[width,opacity] ease-out"
        style={{
          width: state === "loading" ? "85%" : "100%",
          opacity: state === "done" ? 0 : 1,
          transitionDuration: state === "loading" ? "8s" : "300ms",
        }}
      />
    </div>
  );
}
