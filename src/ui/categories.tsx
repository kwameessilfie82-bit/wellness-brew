import { Card, CardContent } from "@/ui/primitives/card";
import { Leaf, Sparkles, Heart, Coffee } from "lucide-react"

const categories = [
  {
    icon: Leaf,
    title: "Hibiscus Teas",
    description: "Fresh & revitalizing blends",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: Sparkles,
    title: "Wellness Blends",
    description: "Health-focused infusions",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: Heart,
    title: "Herbal Teas",
    description: "Caffeine-free relaxation",
    color: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: Coffee,
    title: "Black Teas",
    description: "Bold & energizing",
    color: "bg-chart-5/10 text-chart-5",
  },
]

export function Categories() {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">Shop By Category</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Explore our diverse range of premium teas, each carefully selected for quality and flavor
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <Card
                key={index}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-8 text-center space-y-4">
                  <div
                    className={`w-16 h-16 rounded-2xl ${category.color} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold">{category.title}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
