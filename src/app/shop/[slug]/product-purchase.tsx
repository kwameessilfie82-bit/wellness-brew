"use client";

import { ShoppingCart } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { Button } from "@/ui/primitives/button";

type Props = {
  product: { id: string; name: string; price: number; image: string };
  inStock: boolean;
};

export function ProductPurchase({ product, inStock }: Props) {
  const { addToCart } = useCart();
  return (
    <Button
      size="lg"
      className="h-12 rounded-full text-base"
      disabled={!inStock}
      onClick={() => addToCart(product)}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      {inStock ? "Add to Cart" : "Out of Stock"}
    </Button>
  );
}
