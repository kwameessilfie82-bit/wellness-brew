"use client"

import { Button } from "@/ui/primitives/button"
import { Card, CardContent } from "@/ui/primitives/card"
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { CheckCircle, Clock, Loader2, MapPin, Package, Truck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { formatPrice } from "@/lib/format"

interface OrderItem {
  id: string
  name: string
  price: number
  image: string | null
  quantity: number
}

interface Order {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string | null
  subtotal: number
  shipping: number
  total: number
  createdAt: string
  deliveryAddress: { region?: string; location?: string; landmark?: string }
  items: OrderItem[]
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) {
      setError("Missing order reference")
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`)
        const data = await res.json()
        if (!res.ok) {
          setError(
            res.status === 401
              ? "Please sign in to view this order"
              : data.error ?? "Order not found",
          )
          return
        }
        setOrder(data.order)
      } catch {
        setError("Could not load your order. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-6 text-lg font-medium">{error ?? "Order not found"}</p>
          <div className="flex justify-center gap-3">
            <Button asChild>
              <Link href="/account/orders">My orders</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/shop">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isPaid = order.paymentStatus === "paid"

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-3xl">
        {/* Success Message */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            {isPaid ? (
              <CheckCircle className="h-10 w-10 text-primary" />
            ) : (
              <Clock className="h-10 w-10 text-primary" />
            )}
          </div>
          <h1 className="mb-4 font-serif text-4xl font-bold md:text-5xl">
            {isPaid ? "Order Confirmed!" : "Order Received!"}
          </h1>
          <p className="mb-2 text-lg text-muted-foreground">
            Thank you for your purchase
          </p>
          <p className="text-sm text-muted-foreground">
            Order {order.orderNumber} •{" "}
            {new Date(order.createdAt).toLocaleDateString("en-GH", {
              dateStyle: "medium",
            })}
          </p>
        </div>

        {/* Order Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">What&apos;s Next?</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {isPaid ? "Payment received" : "Payment confirmation"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isPaid
                      ? "Your payment has been confirmed"
                      : "We'll confirm your payment and call you to arrange delivery"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Order Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Your order is being prepared for delivery
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Delivery Updates</p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll call or text you on the phone number you provided
                  </p>
                </div>
              </div>
              {order.deliveryAddress?.location ? (
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Delivering to</p>
                    <p className="text-sm text-muted-foreground">
                      {order.deliveryAddress.location}
                      {order.deliveryAddress.region
                        ? `, ${order.deliveryAddress.region}`
                        : ""}
                      {order.deliveryAddress.landmark
                        ? ` (${order.deliveryAddress.landmark})`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Order Details</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-secondary/20">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover"
                      unoptimized={(item.image ?? "").startsWith("/api/")}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2 border-t border-border pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span>
                  {order.shipping > 0
                    ? formatPrice(order.shipping)
                    : "Confirmed on call"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 text-xl font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild className="flex-1">
            <Link href="/account/orders">View Order Status</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="flex-1 bg-transparent">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <OrderConfirmationContent />
      </Suspense>
      <Footer />
    </div>
  )
}
