"use client"

import { Badge } from "@/ui/primitives/badge"
import { Button } from "@/ui/primitives/button"
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { ProductCard } from "@/ui/product-card"
import { ShoppingCart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useCart } from "@/lib/cart-context"

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string;
  originalPrice: string | null;
  sku: string;
  barcode: string | null;
  images: string;
  isActive: boolean;
  isFeatured: boolean;
  manufacturer: string | null;
  categoryId: string;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface ProductDetailClientProps {
  product: Product;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { addToCart } = useCart()
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchRelated = async () => {
      if (product.categoryName) {
        try {
          const response = await fetch(`/api/products?category=${product.categoryName}&limit=4`)
          const data = await response.json()
          const parsed = (data.products || []).map((p: any) => ({
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
          setRelatedProducts(parsed.filter((p: any) => p.id !== product.id))
        } catch (error) {
          console.error("Error fetching related products:", error)
        }
      }
    }
    fetchRelated()
  }, [product.categoryName, product.id])

  const handleAddToCart = () => {
    const images = (() => {
      try {
        return JSON.parse(product.images || "[]");
      } catch {
        return [];
      }
    })()
    
    addToCart({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: images[0],
    })
  }

  const images = (() => {
    try {
      return JSON.parse(product.images || "[]");
    } catch {
      return [];
    }
  })()

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
              src={images[0] || "/placeholder.svg"} 
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
                {product.description || product.shortDescription || ""}
              </p>
            </div>

            {/* Price and Stock */}
            <div className="border-t border-b border-border py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-4xl font-bold">GHS {parseFloat(product.price).toFixed(2)}</p>
                  {product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) && (
                    <p className="text-sm text-muted-foreground line-through">GHS {parseFloat(product.originalPrice).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="flex gap-3">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 h-12"
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
