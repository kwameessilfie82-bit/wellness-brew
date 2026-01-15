"use client"

import { ShoppingCart } from "lucide-react"
import { Button } from "@/ui/primitives/button";
import { useCart } from "@/lib/cart-context"
import type { Product } from "@/lib/products"

interface AddToCartButtonProps {
  product: Product
  className?: string
}

export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const { addItem } = useCart()

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    })
  }

  return (
    <Button onClick={handleAddToCart} size="lg" className={className}>
      <ShoppingCart className="h-5 w-5 mr-2" />
      Add to Cart
    </Button>
  )
}
