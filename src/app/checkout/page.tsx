"use client"

import type React from "react"

import { Button } from "@/ui/primitives/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { RadioGroup, RadioGroupItem } from "@/ui/primitives/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/ui/primitives/select";
import { useCart } from "@/lib/cart-context"
import { Footer } from "@/ui/footer"
import { Navigation } from "@/ui/navigation"
import { ArrowLeft, CreditCard, Lock, Truck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalPrice, clearCart } = useCart()
  const [isProcessing, setIsProcessing] = useState(false)
  const [shippingMethod, setShippingMethod] = useState("standard")
  const [paymentMethod, setPaymentMethod] = useState("card")

  const shippingCost = shippingMethod === "express" ? 15.99 : shippingMethod === "standard" ? 7.99 : 0
  const tax = (totalPrice + shippingCost) * 0.08 // 8% tax
  const total = totalPrice + shippingCost + tax

  if (items.length === 0) {
    router.push("/shop")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate order ID
    const orderId = Math.random().toString(36).substring(2, 9).toUpperCase()

    // Store order in localStorage
    const order = {
      id: orderId,
      date: new Date().toISOString(),
      items: items,
      total: total,
      status: "Processing",
    }

    const existingOrders = JSON.parse(localStorage.getItem("leafyvibestea-orders") || "[]")
    localStorage.setItem("leafyvibestea-orders", JSON.stringify([order, ...existingOrders]))

    clearCart()
    router.push(`/order-confirmation?orderId=${orderId}`)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/cart"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cart
          </Link>

          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-8">Checkout</h1>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Checkout Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>We'll use this to send order confirmations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" required />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" required />
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="address">Street Address</Label>
                      <Input id="address" required />
                    </div>
                    <div>
                      <Label htmlFor="apartment">Apartment, suite, etc. (optional)</Label>
                      <Input id="apartment" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input id="city" required />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Select required>
                          <SelectTrigger id="state">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CA">California</SelectItem>
                            <SelectItem value="NY">New York</SelectItem>
                            <SelectItem value="TX">Texas</SelectItem>
                            <SelectItem value="FL">Florida</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input id="zip" required />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Method */}
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={shippingMethod} onValueChange={setShippingMethod}>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="standard" id="standard" />
                          <Label htmlFor="standard" className="cursor-pointer">
                            <p className="font-medium">Standard Shipping</p>
                            <p className="text-sm text-muted-foreground">5-7 business days</p>
                          </Label>
                        </div>
                        <span className="font-medium">GHS 7.99</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg mb-3">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="express" id="express" />
                          <Label htmlFor="express" className="cursor-pointer">
                            <p className="font-medium">Express Shipping</p>
                            <p className="text-sm text-muted-foreground">2-3 business days</p>
                          </Label>
                        </div>
                        <span className="font-medium">GHS 15.99</span>
                      </div>
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="overnight" id="overnight" />
                          <Label htmlFor="overnight" className="cursor-pointer">
                            <p className="font-medium">Overnight Shipping</p>
                            <p className="text-sm text-muted-foreground">1 business day</p>
                          </Label>
                        </div>
                        <span className="font-medium">GHS 24.99</span>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                        <RadioGroupItem value="card" id="card" />
                        <Label htmlFor="card" className="cursor-pointer">
                          Credit / Debit Card
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 border border-border rounded-lg">
                        <RadioGroupItem value="paypal" id="paypal" />
                        <Label htmlFor="paypal" className="cursor-pointer">
                          PayPal
                        </Label>
                      </div>
                    </RadioGroup>

                    {paymentMethod === "card" && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input id="cardNumber" placeholder="1234 5678 9012 3456" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="expiry">Expiry Date</Label>
                            <Input id="expiry" placeholder="MM/YY" required />
                          </div>
                          <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" placeholder="123" required />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="cardName">Name on Card</Label>
                          <Input id="cardName" required />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2 pt-4">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Your payment information is secure</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="border border-border rounded-lg p-6 sticky top-24">
                  <h2 className="text-2xl font-serif font-bold mb-6">Order Summary</h2>

                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-secondary/20 flex-shrink-0">
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="text-sm font-medium">GHS {(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 mb-4 border-t border-border pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>GHS {totalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>GHS {shippingCost.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span>GHS {tax.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex items-center justify-between text-xl font-bold">
                      <span>Total</span>
                      <span>GHS {total.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isProcessing}>
                    {isProcessing ? "Processing..." : "Place Order"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  )
}
