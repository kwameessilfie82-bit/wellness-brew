"use client"

import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { ProductCard } from "@/ui/product-card"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"

interface Product {
  id: string
  name: string
  price: number
  images?: string[]
  description?: string
  shortDescription?: string
  categoryName?: string
  isFeatured?: boolean
}

function ShopPageContent() {
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all")
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedCategory !== "all") {
          params.set("category", selectedCategory)
        }
        
        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()
        // Parse images from JSON string to array
        const productsWithParsedImages = (data.products || []).map((p: any) => ({
          ...p,
          images: (() => {
            try {
              if (typeof p.images === 'string') {
                return JSON.parse(p.images);
              }
              return Array.isArray(p.images) ? p.images : [];
            } catch {
              return [];
            }
          })(),
          price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
        }))
        setProducts(productsWithParsedImages)
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        const data = await response.json()
        setCategories(["all", ...(data.categories?.map((c: { slug?: string; name?: string }) => c.slug || c.name) || [])])
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

    fetchProducts()
    fetchCategories()
  }, [selectedCategory])

  const filtered = products

  return (
    <>
      <section className="py-12 md:py-16 border-b border-border">
        <div className="section-container">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Our Collection</h1>
          <p className="text-muted-foreground max-w-2xl">Carefully selected teas from around the world</p>
        </div>
      </section>

      <section className="flex-1 py-12 md:py-16">
        <div className="section-container">
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg transition capitalize ${
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading products...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {filtered.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.images?.[0] || "/placeholder.svg",
                      description: product.shortDescription || product.description,
                      category: product.categoryName,
                    }} 
                  />
                ))}
              </div>
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}

export default function ShopPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }>
        <ShopPageContent />
      </Suspense>
      <Footer />
    </div>
  )
}
