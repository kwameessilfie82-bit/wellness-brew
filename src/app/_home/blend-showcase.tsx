import Image from "next/image";
import Link from "next/link";

import { isUnoptimizedImage, type HomepageContent } from "@/lib/settings/schemas";

/**
 * Auto-scrolling strip of blend photos. Pure CSS: the list renders twice and
 * slides by -50% for a seamless loop; hover/focus pauses it, reduced-motion
 * turns it into a swipeable row.
 */
export function BlendShowcase({
  items,
  eyebrow,
  title,
  subtitle,
}: {
  items: HomepageContent["showcase"];
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  if (items.length === 0) return null;
  const loop = [...items, ...items];

  const Card = ({ item, hidden }: { item: (typeof items)[number]; hidden: boolean }) => {
    const body = (
      <figure className="group relative aspect-[3/4] w-56 shrink-0 overflow-hidden rounded-3xl shadow-lg ring-1 ring-black/5 sm:w-64 md:w-72">
        <Image
          src={item.url}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 14rem, 18rem"
          unoptimized={isUnoptimizedImage(item.url)}
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
        {item.title ? (
          <figcaption className="absolute inset-x-0 bottom-0 translate-y-1 p-5 text-white transition-transform duration-500 group-hover:translate-y-0">
            <span className="block font-serif text-xl font-semibold leading-tight drop-shadow">{item.title}</span>
            {item.href ? (
              <span className="mt-1 block text-xs font-medium uppercase tracking-widest text-white/0 transition-colors duration-500 group-hover:text-white/90">
                Shop now →
              </span>
            ) : null}
          </figcaption>
        ) : null}
      </figure>
    );
    return item.href ? (
      <Link href={item.href} tabIndex={hidden ? -1 : undefined} aria-hidden={hidden || undefined} className="shrink-0">
        {body}
      </Link>
    ) : (
      <div aria-hidden={hidden || undefined} className="shrink-0">
        {body}
      </div>
    );
  };

  return (
    <section className="overflow-hidden bg-gradient-to-b from-background via-secondary/30 to-background py-20">
      <div className="section-container mb-10 text-center">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p> : null}
        {title ? <h2 className="mt-2 font-serif text-4xl font-bold text-heading md:text-5xl">{title}</h2> : null}
        {subtitle ? <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div
        className="marquee-pause relative overflow-x-auto [scrollbar-width:none] motion-safe:overflow-x-hidden [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <div className="animate-marquee flex w-max gap-6 px-3 py-4">
          {loop.map((item, i) => (
            <Card key={`${item.id}-${i}`} item={item} hidden={i >= items.length} />
          ))}
        </div>
      </div>
    </section>
  );
}
