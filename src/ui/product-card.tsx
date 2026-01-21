"use client"

import type React from "react"

import Link from "next/link"
import { ShoppingCart, Star } from "lucide-react"
import { useCart } from "@/lib/cart-context"

interface Product {
  id: number | string
  name: string
  price: number
  image?: string
  description?: string
  rating?: number
  category?: string
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addToCart(product)
  }

  return (
    <Link href={`/shop/${product.id}`}>
      <div className="group bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition">
        <div className="relative overflow-hidden bg-muted h-64">
          <img
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.name}</h3>
          <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
          <div className="flex items-center justify-between">
            {product.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{product.rating}</span>
              </div>
            )}
            <div className="text-lg font-bold">GHS {product.price}</div>
          </div>
          <button
            onClick={handleAddToCart}
            className="w-full mt-4 bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </Link>
  )
}
