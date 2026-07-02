"use client"

import { Button } from "@/ui/primitives/button";
import { Card, CardContent } from "@/ui/primitives/card";
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { FallbackImage } from "@/ui/components/fallback-image"
import { formatPrice } from "@/lib/format"
import { useWishlist } from "@/lib/wishlist-context"
import { ArrowLeft, Heart } from "lucide-react"
import Link from "next/link"

export default function WishlistPage() {
  const { items, isHydrated, removeFromWishlist } = useWishlist();

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Account
          </Link>

          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8">Wishlist</h1>

          {isHydrated && items.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your wishlist is empty</h2>
                <p className="text-muted-foreground mb-6">Save your favorite teas to easily find them later</p>
                <Button asChild>
                  <Link href="/shop">Browse Teas</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <Link href={`/shop/${item.id}`} className="relative block aspect-[4/5] bg-muted">
                    <FallbackImage
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized={item.image?.startsWith("/api/")}
                    />
                  </Link>
                  <CardContent className="p-4">
                    <Link href={`/shop/${item.id}`}>
                      <h3 className="mb-1 line-clamp-2 font-semibold leading-snug hover:text-primary">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="mb-4 text-lg font-bold text-brand">{formatPrice(item.price)}</p>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => removeFromWishlist(item.id)}
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
