"use client";

import { Loader2, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatPrice } from "@/lib/format";
import type { StoreProduct } from "@/lib/products/normalize";
import { cn } from "@/lib/cn";
import { Input } from "@/ui/primitives/input";
import { Button } from "@/ui/primitives/button";

type LiveProductSearchProps = {
  className?: string;
  onNavigate?: () => void;
  autoFocus?: boolean;
};

export function LiveProductSearch({
  className,
  onNavigate,
  autoFocus = false,
}: LiveProductSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const fetchResults = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/products/search?q=${encodeURIComponent(trimmed)}&limit=8`,
      );
      const data = await res.json();
      const products = (data.products ?? []) as StoreProduct[];
      setResults(products);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchResults(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToShop = (search?: string) => {
    const q = (search ?? query).trim();
    if (q) {
      router.push(`/shop?search=${encodeURIComponent(q)}`);
    } else {
      router.push("/shop");
    }
    setOpen(false);
    setQuery("");
    onNavigate?.();
  };

  const selectProduct = (product: StoreProduct) => {
    router.push(`/shop/${product.id}`);
    setOpen(false);
    setQuery("");
    onNavigate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        selectProduct(results[activeIndex]);
      } else {
        goToShop();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search teas, blends, wellness..."
          className="rounded-full pl-10 pr-10"
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="live-search-results"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {open && query.trim() ? (
        <div
          id="live-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(24rem,70vh)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        >
          {results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-2">
              {results.map((product, index) => (
                <li key={product.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      index === activeIndex
                        ? "bg-muted"
                        : "hover:bg-muted/70",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectProduct(product)}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={product.image || "/placeholder.svg"}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized={
                          (product.image || "").startsWith("/api/") ||
                          (product.image || "").startsWith("data:")
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {product.categoryName ?? "Wellness"}
                        {product.sku ? ` · ${product.sku}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand">
                      {formatPrice(product.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No products found for &ldquo;{query}&rdquo;
            </p>
          ) : null}

          <div className="border-t border-border px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center rounded-lg"
              onClick={() => goToShop()}
            >
              View all results for &ldquo;{query}&rdquo;
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
