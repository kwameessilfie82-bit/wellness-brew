"use client"

import { Badge } from "@/ui/primitives/badge"
import { Button } from "@/ui/primitives/button"
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { ProductCard } from "@/ui/product-card"
import { ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useCart } from "@/lib/cart-context"

interface Product {
  id: string
  name: string
  price: number
  images?: string[]
  description?: string
  shortDescription?: string
  categoryName?: string
  isFeatured?: boolean
  quantityAvailable?: number
}

export default function ProductDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { addToCart } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        // Try to fetch by ID first
        const response = await fetch(`/api/products`)
        const data = await response.json()
        const foundProduct = data.products?.find((p: Product) => p.id === id || p.id === String(id))
        
        if (foundProduct) {
          setProduct(foundProduct)
          // Fetch related products from same category
          if (foundProduct.categoryName) {
            const relatedResponse = await fetch(`/api/products?category=${foundProduct.categoryName}&limit=4`)
            const relatedData = await relatedResponse.json()
            setRelatedProducts(relatedData.products?.filter((p: Product) => p.id !== foundProduct.id) || [])
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchProduct()
    }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/shop">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0],
    })
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Breadcrumb */}
      <div className="section-container py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link href="/shop" className="hover:text-foreground">
            Shop
          </Link>
          {product.categoryName && (
            <>
              <span>/</span>
              <Link href={`/shop?category=${product.categoryName}`} className="hover:text-foreground">
                {product.categoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </div>
      </div>

      {/* Product Details */}
      <div className="section-container pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-secondary/20">
            <Image 
              src={product.images?.[0] || "/placeholder.svg"} 
              alt={product.name} 
              fill 
              className="object-cover" 
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {product.categoryName && (
                <p className="text-sm text-muted-foreground mb-2">{product.categoryName}</p>
              )}
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{product.name}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {product.description || product.shortDescription}
              </p>
            </div>

            {/* Price and Stock */}
            <div className="border-t border-b border-border py-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-4xl font-bold">GHS {product.price.toFixed(2)}</p>
                {product.quantityAvailable !== undefined && (
                  <Badge variant={product.quantityAvailable > 0 ? "default" : "destructive"}>
                    {product.quantityAvailable > 0 ? `${product.quantityAvailable} in stock` : "Out of stock"}
                  </Badge>
                )}
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 h-12"
                disabled={product.quantityAvailable !== undefined && product.quantityAvailable === 0}
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-serif font-bold">You May Also Like</h2>
              {product.categoryName && (
                <Link href={`/shop?category=${product.categoryName}`}>
                  <Button variant="outline">View All {product.categoryName}</Button>
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard 
                  key={relatedProduct.id} 
                  product={{
                    id: relatedProduct.id,
                    name: relatedProduct.name,
                    price: relatedProduct.price,
                    image: relatedProduct.images?.[0],
                    description: relatedProduct.shortDescription || relatedProduct.description,
                    category: relatedProduct.categoryName,
                  }} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
