import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getPublishedPosts } from "@/lib/journal/server";
import { formatPostDate, minutesFromWords } from "@/lib/journal/utils";
import { isUnoptimizedImage } from "@/lib/settings/schemas";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { Button } from "@/ui/primitives/button";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Brew Journal",
  description: "Brewing guides, tea stories and wellness tips from our kitchen to your cup.",
  alternates: { canonical: "/journal" },
};

const PAGE_SIZE = 12;

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);
  const { posts, total } = await getPublishedPosts({ page, limit: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 py-16 md:py-24">
        <div className="section-container">
          <h1 className="mb-4 font-serif text-4xl font-bold text-foreground md:text-5xl">Brew Journal</h1>
          <p className="mb-10 max-w-2xl text-muted-foreground">
            Brewing guides, tea stories and wellness tips from our kitchen to your cup.
          </p>

          {posts.length === 0 ? (
            <div className="rounded-xl border p-10 text-center">
              <p className="text-muted-foreground">No articles yet. Check back soon.</p>
              <Button asChild className="mt-4">
                <Link href="/shop">Shop the teas</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/journal/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] bg-muted">
                    {p.coverUrl && (
                      <Image
                        src={p.coverUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        unoptimized={isUnoptimizedImage(p.coverUrl)}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p className="text-xs text-muted-foreground">
                      {formatPostDate(p.publishedAt)} · {minutesFromWords(p.words)} min read
                    </p>
                    <h2 className="font-serif text-xl font-semibold text-foreground">{p.title}</h2>
                    {p.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-12 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Button asChild variant="outline">
                  <Link href={page === 2 ? "/journal" : `/journal?page=${page - 1}`}>Newer</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Button asChild variant="outline">
                  <Link href={`/journal?page=${page + 1}`}>Older</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
