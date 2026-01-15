import { Navigation } from "@/ui/navigation"
import { Footer } from "@/ui/footer"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
              About LeafyVibesTea
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We are passionate about bringing you the finest selection of premium teas and wellness products. 
              Our mission is to help you achieve optimal health and wellness through natural, carefully sourced ingredients.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mt-16">
            <div>
              <h2 className="text-3xl font-serif font-bold mb-4">Our Story</h2>
              <p className="text-muted-foreground leading-relaxed">
                Founded with a vision to make premium wellness products accessible to everyone, LeafyVibesTea has been 
                dedicated to sourcing the finest teas and herbal blends from around the world. Each product is carefully 
                selected for its quality, purity, and health benefits.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                We believe that wellness starts with what you consume. Our commitment is to provide you with 
                natural, organic products that support your health journey. Every tea in our collection is 
                chosen for its unique properties and benefits.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
