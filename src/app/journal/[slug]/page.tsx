import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getPostBySlug, getPublishedPostSlugs } from "@/lib/journal/server";
import { formatPostDate, readingMinutes } from "@/lib/journal/utils";
import { articleLd, breadcrumbLd, JsonLd } from "@/lib/seo/json-ld";
import { absoluteImage, metaDescription } from "@/lib/seo/site";
import { isUnoptimizedImage } from "@/lib/settings/schemas";
import { Markdown, markdownToText } from "@/ui/components/markdown";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { Button } from "@/ui/primitives/button";

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    return (await getPublishedPostSlugs()).map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const path = `/journal/${post.slug}`;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || metaDescription(markdownToText(post.body));
  const image = absoluteImage(post.coverUrl);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: path,
      ...(post.publishedAt ? { publishedTime: post.publishedAt.toISOString() } : {}),
      modifiedTime: post.updatedAt.toISOString(),
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const path = `/journal/${post.slug}`;
  const description = post.seoDescription || post.excerpt || metaDescription(markdownToText(post.body));

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />
      <main className="flex-1 py-16 md:py-24">
        <article className="section-container">
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
              <Link href="/journal" className="hover:underline">
                Brew Journal
              </Link>
            </nav>
            <h1 className="mb-4 font-serif text-4xl font-bold text-foreground md:text-5xl">{post.title}</h1>
            <p className="mb-8 text-sm text-muted-foreground">
              {formatPostDate(post.publishedAt)} · {readingMinutes(post.body)} min read
            </p>
            {post.coverUrl && (
              <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
                <Image
                  src={post.coverUrl}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 768px) 768px, 100vw"
                  unoptimized={isUnoptimizedImage(post.coverUrl)}
                  className="object-cover"
                />
              </div>
            )}
            <Markdown source={post.body} className="space-y-4 text-lg leading-relaxed text-muted-foreground" />

            <div className="mt-14 rounded-xl border bg-card p-8 text-center">
              <p className="font-serif text-2xl font-semibold text-foreground">Ready to brew?</p>
              <p className="mt-2 text-muted-foreground">Fresh blends, packed in Ghana and delivered to your door.</p>
              <Button asChild className="mt-4">
                <Link href="/shop">Shop the teas</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>
      <Footer />
      <JsonLd
        data={[
          articleLd({
            title: post.title,
            description,
            path,
            image: post.coverUrl,
            publishedAt: post.publishedAt,
            updatedAt: post.updatedAt,
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Brew Journal", path: "/journal" },
            { name: post.title, path },
          ]),
        ]}
      />
    </div>
  );
}
