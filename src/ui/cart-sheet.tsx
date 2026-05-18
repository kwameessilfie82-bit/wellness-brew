"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { X, Plus, Minus, ShoppingBag } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/ui/primitives/sheet"
import { Button } from "@/ui/primitives/button"
import { useCart } from "@/lib/cart-context"
import { formatPrice } from "@/lib/format"
import { ScrollArea } from "@/ui/primitives/scroll-area"

interface CartSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const router = useRouter()
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart()

  const handleCheckout = () => {
    onOpenChange(false)
    router.push("/checkout")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col gap-0 p-6 sm:max-w-lg">
        <SheetHeader className="shrink-0 space-y-0 p-0 pb-4">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <ShoppingBag className="h-5 w-5" />
            Shopping Cart ({totalItems})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">Your cart is empty</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Add some delicious teas to get started!
            </p>
            <Button onClick={() => onOpenChange(false)} asChild>
              <Link href="/shop">Browse Teas</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 py-2 pr-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b border-border pb-4">
                    <Link href={`/shop/${item.id}`} onClick={() => onOpenChange(false)}>
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-secondary/20">
                        <Image
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/shop/${item.id}`}
                        onClick={() => onOpenChange(false)}
                        className="line-clamp-2 font-medium transition-colors hover:text-brand"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-sm font-semibold">{formatPrice(item.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 bg-transparent"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 shrink-0 space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Shipping and taxes calculated at checkout
              </p>
              <Button onClick={handleCheckout} size="lg" className="w-full">
                Proceed to Checkout
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
