import { Button } from "@/ui/primitives/button";
import { ArrowRight } from "lucide-react"
import Image from "next/image"

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-secondary/30">
      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-block">
              <span className="text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-full">
                {"✨ Premium Tea Collection"}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-balance leading-tight">
              Welcome To Your Tea Haven
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty leading-relaxed">
              Discover our carefully curated collection of premium teas, wellness blends, and artisan teaware. Every sip
              is a journey to comfort and healing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="text-base group">
                Shop Collection
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button size="lg" variant="outline" className="text-base bg-transparent">
                Explore Blends
              </Button>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative h-[400px] md:h-[600px]">
            <div className="absolute inset-0 bg-primary/5 rounded-3xl" />
            <Image
              src="/premium-tea-cup-with-fresh-tea-leaves-and-steam.jpg"
              alt="Premium tea collection"
              fill
              className="object-cover rounded-3xl"
              priority
            />
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
    </section>
  )
}
