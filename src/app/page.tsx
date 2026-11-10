import {
  Award,
  Clock,
  Coffee,
  Gift,
  Heart,
  Leaf,
  type LucideIcon,
  MessageCircle,
  Shield,
  Sparkles,
  Star,
  Sun,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { Metadata } from "next";

import { cn } from "@/lib/cn";
import { getFeaturedProducts } from "@/lib/products/server";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand, isUnoptimizedImage, type HomepageContent } from "@/lib/settings/schemas";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { Button } from "@/ui/primitives/button";

import { BlendShowcase } from "./_home/blend-showcase";
import { FeaturedProducts } from "./_home/featured-products";

const ICONS: Record<HomepageContent["valueProps"][number]["icon"], LucideIcon> = {
  award: Award,
  truck: Truck,
  leaf: Leaf,
  heart: Heart,
  sparkles: Sparkles,
  shield: Shield,
  clock: Clock,
  gift: Gift,
  coffee: Coffee,
  sun: Sun,
  star: Star,
  message: MessageCircle,
};

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [{ brand }, content, featured] = await Promise.all([
    getPublicSettings(),
    getSettings("homepage"),
    getFeaturedProducts(4).catch((error) => {
      console.error("[home] featured products failed:", error);
      return [];
    }),
  ]);
  const f = (text: string) => fillBrand(text, brand.name);

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <section className="relative overflow-hidden bg-background pb-20 pt-20 md:pb-28 md:pt-32">
        <div className="hero-glow" aria-hidden />
        <div className="hero-pattern" aria-hidden />
        <div className="hero-bottom-blend" aria-hidden />

        <div className="section-container relative z-10">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="max-w-2xl animate-fade-in-up">
              {content.badge ? (
                <div className="badge-brand mb-6">
                  <Sparkles className="h-4 w-4" />
                  {f(content.badge)}
                </div>
              ) : null}
              <h1 className="mb-6 font-serif text-5xl font-bold leading-[1.1] tracking-tight text-heading md:text-6xl lg:text-7xl">
                {f(content.titleLead)}
                {content.titleHighlight ? (
                  <>
                    {" "}
                    <span className="text-gradient-hero">{f(content.titleHighlight)}</span>
                  </>
                ) : null}
              </h1>
              {content.subtitle ? (
                <p className="mb-8 text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {f(content.subtitle)}
                </p>
              ) : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                {content.primaryCtaLabel && content.primaryCtaHref ? (
                  <Link href={content.primaryCtaHref}>
                    <Button size="lg" className="h-12 rounded-full px-8 text-base">
                      {content.primaryCtaLabel}
                    </Button>
                  </Link>
                ) : null}
                {content.secondaryCtaLabel && content.secondaryCtaHref ? (
                  <Link href={content.secondaryCtaHref}>
                    <Button size="lg" variant="outline" className="h-12 rounded-full px-8 text-base">
                      {content.secondaryCtaLabel}
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>

            {content.heroImageUrl ? (
              <div className="relative h-[380px] animate-fade-in-up-delay-2 md:h-[520px]">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
                <div className="relative h-full overflow-hidden rounded-3xl border border-border/60 bg-white shadow-2xl">
                  <Image
                    src={content.heroImageUrl}
                    alt={f(content.heroImageAlt)}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-contain"
                    priority
                    unoptimized={isUnoptimizedImage(content.heroImageUrl)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <BlendShowcase
        items={content.showcase}
        eyebrow={f(content.showcaseEyebrow)}
        title={f(content.showcaseTitle)}
        subtitle={f(content.showcaseSubtitle)}
      />

      <section className="relative bg-background py-16 md:py-24">
        <div className="section-container">
          <div className="mb-12 animate-fade-in-up">
            {content.featuredEyebrow ? (
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
                {f(content.featuredEyebrow)}
              </p>
            ) : null}
            {content.featuredTitle ? (
              <h2 className="font-serif text-4xl font-bold text-heading">{f(content.featuredTitle)}</h2>
            ) : null}
            {content.featuredSubtitle ? (
              <p className="mt-2 max-w-xl text-muted-foreground">{f(content.featuredSubtitle)}</p>
            ) : null}
          </div>
          <FeaturedProducts initialProducts={featured} />
        </div>
      </section>

      {content.valueProps.length > 0 ? (
        <section className="border-y border-border/60 bg-secondary/40 py-20">
          <div className="section-container">
            <div
              className={cn(
                "grid grid-cols-1 gap-10",
                content.valueProps.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-2",
              )}
            >
              {content.valueProps.map((item, i) => {
                const Icon = ICONS[item.icon];
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex gap-4 rounded-2xl bg-card/60 p-6 backdrop-blur-sm",
                      i % 3 === 1 && "animate-fade-in-up-delay-1",
                      i % 3 === 2 && "animate-fade-in-up-delay-2",
                    )}
                  >
                    <Icon className="mt-1 h-8 w-8 shrink-0 text-brand" />
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-heading">{f(item.title)}</h3>
                      <p className="text-muted-foreground">{f(item.text)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {content.closingTitle ? (
        <section className="py-20">
          <div className="section-container text-center">
            <h2 className="mb-4 font-serif text-3xl font-bold text-heading md:text-4xl">
              {f(content.closingTitle)}
            </h2>
            {content.closingText ? (
              <p className="mx-auto mb-8 max-w-lg text-muted-foreground">{f(content.closingText)}</p>
            ) : null}
            {content.closingCtaLabel && content.closingCtaHref ? (
              <Link href={content.closingCtaHref}>
                <Button size="lg" className="h-12 rounded-full px-10">
                  {content.closingCtaLabel}
                </Button>
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <Footer />
    </div>
  );
}
