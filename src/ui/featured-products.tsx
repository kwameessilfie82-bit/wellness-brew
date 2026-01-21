import { Card, CardContent, CardFooter } from "@/ui/primitives/card";
import { Button } from "@/ui/primitives/button";
import { Badge } from "@/ui/primitives/badge"
import { Star, ShoppingCart } from "lucide-react"
import Image from "next/image"

const products = [
  {
    name: "Hibiscus Ginger Blend",
    price: "₵45.00",
    rating: 4.8,
    reviews: 124,
    image: "hibiscus ginger tea packaging with fresh ingredients",
    badge: "Best Seller",
    badgeColor: "bg-accent text-accent-foreground",
  },
  {
    name: "Moringa Hibiscus Tea",
    price: "₵50.00",
    rating: 4.9,
    reviews: 98,
    image: "moringa hibiscus tea with leaves in elegant packaging",
    badge: "New",
    badgeColor: "bg-primary text-primary-foreground",
  },
  {
    name: "Pineapple Hibiscus",
    price: "₵48.00",
    rating: 4.7,
    reviews: 156,
    image: "tropical pineapple hibiscus tea blend with fruit",
    badge: "Popular",
    badgeColor: "bg-chart-2 text-white",
  },
  {
    name: "Cinnamon Wellness",
    price: "₵52.00",
    rating: 5.0,
    reviews: 87,
    image: "cinnamon wellness tea with spices and herbs",
    badge: "Premium",
    badgeColor: "bg-chart-5 text-white",
  },
]

export function FeaturedProducts() {
  return (
    <section className="py-16 md:py-24 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">Featured Teas</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Our most loved tea blends, crafted with the finest natural ingredients
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {products.map((product, index) => (
            <Card key={index} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
              <CardContent className="p-0">
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={`/.jpg?height=320&width=280&query=${product.image}`}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <Badge className={`absolute top-4 left-4 ${product.badgeColor}`}>{product.badge}</Badge>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{product.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium ml-1">{product.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {"("}
                      {product.reviews} reviews{")"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{product.price}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <Button className="w-full group/btn">
                  <ShoppingCart className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline">
            View All Products
          </Button>
        </div>
      </div>
    </section>
  )
}
