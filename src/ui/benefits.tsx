import { Card, CardContent } from "@/ui/primitives/card";
import { Truck, Award, Shield, Headphones } from "lucide-react"

const benefits = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "On orders over ₵100",
  },
  {
    icon: Award,
    title: "Premium Quality",
    description: "100% natural ingredients",
  },
  {
    icon: Shield,
    title: "Secure Payment",
    description: "Safe & protected checkout",
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "24/7 customer service",
  },
]

export function Benefits() {
  return (
    <section className="py-16 md:py-24 bg-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <Card key={index} className="border-0 bg-transparent shadow-none">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
