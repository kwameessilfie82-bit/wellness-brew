import { Navigation } from "@/ui/navigation"
import { Footer } from "@/ui/footer"
import Image from "next/image"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
              About LeafyVibesTea
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We are passionate about bringing you the finest selection of premium Rose of Sharon (Hibiscus) teas and wellness products. 
              Our mission is to help you achieve optimal health and wellness through natural, carefully sourced ingredients.
            </p>
          </div>

          {/* Hibiscus Images Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="/hibiscus.png"
                alt="Hibiscus flower"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="/rose of sharon.png"
                alt="Rose of Sharon flower"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative h-64 rounded-lg overflow-hidden">
              <Image
                src="/hibiscus 3.png"
                alt="Hibiscus tea"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mt-16">
            <div>
              <h2 className="text-3xl font-serif font-bold mb-4">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Founded with a vision to make premium wellness products accessible to everyone, LeafyVibesTea has been 
                dedicated to sourcing the finest Rose of Sharon (Hibiscus) teas and herbal blends from around the world. 
                Each product is carefully selected for its quality, purity, and health benefits.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The Rose of Sharon, also known as Hibiscus, has been treasured for centuries for its healing properties 
                and beautiful appearance. We honor this sacred flower by creating premium tea blends that capture its essence 
                and wellness benefits.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We believe that wellness starts with what you consume. Our commitment is to provide you with 
                natural, organic Rose of Sharon (Hibiscus) products that support your health journey. Every tea in our 
                collection is chosen for its unique properties and benefits.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Inspired by the beauty and healing power of the Rose of Sharon, we craft each blend with care, ensuring 
                that every cup brings you closer to wellness and peace.
              </p>
            </div>
          </div>

          {/* Additional Hibiscus Images */}
          <div className="grid md:grid-cols-2 gap-6 mt-16">
            <div className="relative h-80 rounded-lg overflow-hidden">
              <Image
                src="/rose of sharon 1.png"
                alt="Rose of Sharon flower"
                fill
                className="object-cover"
              />
            </div>
            <div className="relative h-80 rounded-lg overflow-hidden">
              <Image
                src="/rose of sharon 2.png"
                alt="Rose of Sharon flower"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
