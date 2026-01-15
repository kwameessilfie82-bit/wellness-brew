"use client"

import { ShoppingCart } from "lucide-react"
import { Button } from "@/ui/primitives/button";
import { useCart } from "@/lib/cart-context"
// Product type definition
interface Product {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  description?: string;
}

interface AddToCartButtonProps {
  product: Product
  className?: string
}

export function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const { addToCart } = useCart()

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    })
  }

  return (
    <Button onClick={handleAddToCart} size="lg" className={className}>
      <ShoppingCart className="h-5 w-5 mr-2" />
      Add to Cart
    </Button>
  )
}
