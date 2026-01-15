"use client"

import { Button } from "@/ui/primitives/button"
import { Card, CardContent } from "@/ui/primitives/card"
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { CheckCircle, Mail, Package, Truck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"

interface Order {
  id: string
  date: string
  items: Array<{
    id: number
    name: string
    price: number
    image: string
    quantity: number
  }>
  total: number
  status: string
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (orderId) {
      const orders = JSON.parse(localStorage.getItem("leafyvibestea-orders") || "[]")
      const foundOrder = orders.find((o: Order) => o.id === orderId)
      if (foundOrder) {
        setOrder(foundOrder)
      }
    }
  }, [orderId])

  if (!order) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <p>Order not found</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Order Confirmed!</h1>
            <p className="text-lg text-muted-foreground mb-2">Thank you for your purchase</p>
            <p className="text-sm text-muted-foreground">
              Order #{order.id} • {new Date(order.date).toLocaleDateString()}
            </p>
          </div>

          {/* Order Status */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">What's Next?</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Order Confirmation Email</p>
                    <p className="text-sm text-muted-foreground">
                      We've sent a confirmation email with your order details
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Order Processing</p>
                    <p className="text-sm text-muted-foreground">Your order is being prepared for shipment</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Shipping Updates</p>
                    <p className="text-sm text-muted-foreground">
                      You'll receive tracking information once your order ships
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Order Details</h2>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="relative w-20 h-20 rounded-md overflow-hidden bg-secondary/20 flex-shrink-0">
                      <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      <p className="text-sm font-medium mt-1">${item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-6 pt-4">
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>Total</span>
                  <span>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" asChild className="flex-1">
              <Link href="/account/orders">View Order Status</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="flex-1 bg-transparent">
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <Navigation />
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <p>Loading...</p>
            </div>
          </div>
          <Footer />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  )
}
