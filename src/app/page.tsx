"use client"

import Link from "next/link"
import { Leaf, Award, Truck } from "lucide-react"
import { Navigation } from "@/ui/navigation"
import { Footer } from "@/ui/footer"
import { ProductCard } from "@/ui/product-card"
import { useEffect, useState } from "react"

interface FeaturedProduct {
  id: string
  name: string
  price: string
  images: string
  shortDescription?: string
  description?: string
  quantityAvailable?: number
}

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch("/api/products/featured")
        const data = await response.json()
        
        if (data.products && Array.isArray(data.products)) {
          // Take first 4 products
          const products = data.products.slice(0, 4).map((p: any) => ({
            id: p.id,
            name: p.name,
            price: parseFloat(p.price || 0),
            image: (() => {
              try {
                const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                return Array.isArray(images) && images.length > 0 ? images[0] : "/placeholder.svg";
              } catch {
                return "/placeholder.svg";
              }
            })(),
            description: p.shortDescription || p.description || "",
          }))
          setFeaturedProducts(products)
        }
      } catch (error) {
        console.error("Error fetching featured products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedProducts()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-20 md:py-32">
        <div className="section-container">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 mb-4 bg-secondary/20 px-3 py-1 rounded-full">
              <Leaf className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-accent">100% Natural & Organic</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-4 leading-tight">
              Elevate Your Wellness Journey
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Discover premium herbal and specialty teas crafted for your mind, body, and spirit. Each blend is
              carefully selected and sourced from the finest tea gardens.
            </p>
            <div className="flex gap-4">
              <Link href="/shop" className="btn-primary">
                Explore Our Collection
              </Link>
              <Link href="/about" className="btn-secondary">
                Learn Our Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 md:py-28">
        <div className="section-container">
          <div className="mb-12">
            <h2 className="text-4xl font-serif font-bold mb-3">Featured Blends</h2>
            <p className="text-muted-foreground max-w-2xl">
              Our most loved teas selected by wellness enthusiasts worldwide
            </p>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading featured products...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No featured products available. Please seed the inventory first.</p>
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-primary/5 py-20 md:py-28">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <Award className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Premium Quality</h3>
                <p className="text-muted-foreground">Sourced from the finest organic tea gardens</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Truck className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">Free Shipping</h3>
                <p className="text-muted-foreground">On orders over $50. Fast delivery to your door</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Leaf className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">100% Natural</h3>
                <p className="text-muted-foreground">No artificial ingredients or preservatives</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}