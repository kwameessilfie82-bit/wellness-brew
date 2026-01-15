import Image from "next/image"

export function About() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative h-[400px] md:h-[600px] order-2 md:order-1">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl" />
            <Image
              src="/traditional-tea-ceremony-with-natural-herbs-and-bo.jpg"
              alt="About leafyvibestea"
              fill
              className="object-cover rounded-3xl"
            />
          </div>

          {/* Content */}
          <div className="space-y-6 order-1 md:order-2">
            <div className="inline-block">
              <span className="text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-full">Our Story</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-serif font-bold text-balance">A Tea Lover&apos;s Safe Haven</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                At leafyvibestea, we believe tea is more than just a drink. It&apos;s comfort, healing, and a daily
                ritual of slowing down in our fast-paced world.
              </p>
              <p>
                Our blends are carefully chosen to celebrate the wisdom of plants, the serenity of tea time, and the joy
                of discovering new flavors. We source only the finest natural ingredients, creating teas that promote
                wellness and delight your senses.
              </p>
              <p>We&apos;re honored to be part of your tea journey, one soothing cup at a time.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
