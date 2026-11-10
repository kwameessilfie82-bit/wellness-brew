import Image from "next/image";

import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { fillBrand, isUnoptimizedImage, paragraphs } from "@/lib/settings/schemas";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

export async function generateMetadata() {
  const [{ brand }, about] = await Promise.all([getPublicSettings(), getSettings("about")]);
  return { title: fillBrand(about.title, brand.name) };
}

export default async function AboutPage() {
  const [{ brand }, about] = await Promise.all([getPublicSettings(), getSettings("about")]);
  const f = (text: string) => fillBrand(text, brand.name);
  const blocks = [
    { key: "story", title: about.storyTitle, body: about.story },
    { key: "mission", title: about.missionTitle, body: about.mission },
  ].filter((b) => b.body.trim());
  const imageGrid =
    about.images.length === 1
      ? "mx-auto mb-16 max-w-xl"
      : about.images.length === 2 || about.images.length === 4
        ? "mb-16 grid gap-6 sm:grid-cols-2"
        : "mb-16 grid gap-6 sm:grid-cols-2 md:grid-cols-3";

  return (
    <div className="flex min-h-screen flex-col">
      <Navigation />

      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h1 className="mb-6 font-serif text-5xl font-bold text-heading md:text-6xl">{f(about.title)}</h1>
            {paragraphs(about.intro).map((p, i) => (
              <p key={i} className="mb-4 text-lg leading-relaxed text-muted-foreground">
                {f(p)}
              </p>
            ))}
          </div>

          {about.images.length > 0 ? (
            <div className={imageGrid}>
              {about.images.map((img) => (
                <div
                  key={img.id}
                  className="relative flex h-64 items-center justify-center overflow-hidden rounded-lg bg-secondary/20"
                >
                  <Image
                    src={img.url}
                    alt={f(img.alt)}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-contain p-2"
                    unoptimized={isUnoptimizedImage(img.url)}
                  />
                </div>
              ))}
            </div>
          ) : null}

          {blocks.length > 0 ? (
            <div className={blocks.length === 2 ? "grid gap-12 md:grid-cols-2" : "mx-auto max-w-3xl"}>
              {blocks.map((b) => (
                <div key={b.key}>
                  {b.title ? (
                    <h2 className="mb-4 font-serif text-3xl font-bold text-heading">{f(b.title)}</h2>
                  ) : null}
                  {paragraphs(b.body).map((p, i) => (
                    <p key={i} className="mb-4 leading-relaxed text-muted-foreground">
                      {f(p)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </div>
  );
}
