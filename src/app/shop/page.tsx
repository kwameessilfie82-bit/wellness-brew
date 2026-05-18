"use client"

import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { ProductCard } from "@/ui/product-card"
import { useState, useEffect, Suspense, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { StoreProduct } from "@/lib/products/normalize"

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function ShopPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all")
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchProducts = useCallback(async (page: number = 1, append: boolean = false) => {
      try {
      if (page === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

        const params = new URLSearchParams()
        if (selectedCategory !== "all") {
          params.set("category", selectedCategory)
        }
      if (searchQuery) {
        params.set("search", searchQuery)
      }
      params.set("page", page.toString())
      params.set("limit", "12")
        
        const response = await fetch(`/api/products?${params.toString()}`)
        const data = await response.json()
      
      const nextProducts = (data.products || []) as StoreProduct[]

      if (append) {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id))
          const newProducts = nextProducts.filter((p) => !existingIds.has(p.id))
          return [...prev, ...newProducts]
        })
      } else {
        setProducts(nextProducts)
      }

      if (data.pagination) {
        setPagination(data.pagination)
      }
      } catch (error) {
        console.error("Error fetching products:", error)
      } finally {
        setLoading(false)
      setLoadingMore(false)
      }
  }, [selectedCategory, searchQuery])

  useEffect(() => {
    // Read search query from URL params
    const urlSearch = searchParams.get("search") || ""
    setSearchQuery(urlSearch)
  }, [searchParams])

  useEffect(() => {
    // Reset to page 1 when category or search changes
    setProducts([])
    fetchProducts(1, false)
  }, [selectedCategory, searchQuery, fetchProducts])

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        const data = await response.json()
        setCategories(["all", ...(data.categories?.map((c: { slug?: string; name?: string }) => c.slug || c.name) || [])])
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting && 
          !loadingMore && 
          !loading &&
          pagination.page < pagination.totalPages
        ) {
          fetchProducts(pagination.page + 1, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [loadingMore, loading, pagination, fetchProducts])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString())
    if (cat === "all") {
      params.delete("category")
    } else {
      params.set("category", cat)
    }
    if (searchQuery) {
      params.set("search", searchQuery)
    }
    router.push(`/shop?${params.toString()}`)
  }

  return (
    <>
      <section className="section-hero-bg py-14 md:py-20">
        <div className="section-container animate-fade-in-up">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand">
            Shop
          </p>
          <h1 className="mb-4 font-serif text-4xl font-bold text-heading md:text-5xl">
            Our collection
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Carefully selected wellness teas — shipped fresh to you
          </p>
        </div>
      </section>

      <section className="flex-1 py-12 md:py-16">
        <div className="section-container">
          {searchQuery && (
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Search results for:</p>
                <p className="text-lg font-semibold">&ldquo;{searchQuery}&rdquo;</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("")
                  const params = new URLSearchParams(searchParams.toString())
                  params.delete("search")
                  router.push(`/shop?${params.toString()}`)
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
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
                {products.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      description: product.shortDescription || product.description || undefined,
                      category: product.categoryName || undefined,
                    }} 
                  />
                ))}
              </div>
              
              {/* Infinite scroll trigger */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {loadingMore && (
                  <p className="text-muted-foreground">Loading more products...</p>
                )}
              </div>

              {products.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No products found. Try adjusting your filters.</p>
                </div>
              )}

              {products.length > 0 && pagination.page >= pagination.totalPages && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">You&apos;ve reached the end of the collection</p>
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
