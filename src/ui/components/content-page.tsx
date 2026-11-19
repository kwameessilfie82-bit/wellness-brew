import type { Metadata } from "next";

import type { PageKey } from "@/lib/settings/growth-schemas";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand } from "@/lib/settings/schemas";
import { metaDescription } from "@/lib/seo/site";
import { Markdown, markdownToText } from "@/ui/components/markdown";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

/** Metadata for an owner-edited page (Settings → Pages & FAQ). */
export async function contentPageMetadata(key: PageKey, path: string): Promise<Metadata> {
  const [pages, { brand }] = await Promise.all([getSettings("pages"), getPublicSettings()]);
  const page = pages[key];
  return {
    title: page.title,
    description: metaDescription(fillBrand(markdownToText(page.body), brand.name)),
    alternates: { canonical: path },
  };
}

export function PageShell({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 py-16 md:py-24">
        <div className="section-container">
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-4 font-serif text-4xl font-bold text-foreground md:text-5xl">{title}</h1>
            {subtitle ? <div className="mb-10 text-muted-foreground">{subtitle}</div> : <div className="mb-10" />}
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** Renders one owner-edited Markdown page. */
export async function ContentPage({ pageKey }: { pageKey: PageKey }) {
  const [pages, { brand }] = await Promise.all([getSettings("pages"), getPublicSettings()]);
  const page = pages[pageKey];
  return (
    <PageShell
      title={page.title}
      subtitle={
        page.updatedOn ? (
          <p className="text-sm">
            Last updated:{" "}
            {new Date(`${page.updatedOn}T00:00:00`).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        ) : null
      }
    >
      <Markdown source={fillBrand(page.body, brand.name)} className="space-y-4 text-lg leading-relaxed text-muted-foreground" />
    </PageShell>
  );
}
