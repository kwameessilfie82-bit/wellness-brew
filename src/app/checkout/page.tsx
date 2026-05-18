"use client";

import type React from "react";

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
import { useCart } from "@/lib/cart-context";
import { useCurrentUser, signIn } from "@/lib/auth-client";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import {
  DeliveryLocationPicker,
  type DeliveryLocationValue,
} from "@/ui/components/delivery-location-picker";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { GoogleIcon } from "@/ui/components/icons/google";
import { toast } from "sonner";

const DELIVERY_FEE = 0;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { user, isPending } = useCurrentUser();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "momo">("momo");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [delivery, setDelivery] = useState<DeliveryLocationValue>({
    region: "",
    location: "",
    landmark: "",
  });
  const [authLoading, setAuthLoading] = useState(false);

  const total = totalPrice + DELIVERY_FEE;

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const res = await fetch("/api/account/profile");
        if (!res.ok) return;
        const { profile } = await res.json();
        setCustomerName(profile.name ?? user.name ?? "");
        setCustomerPhone(profile.phone ?? "");
        setDelivery({
          region: profile.deliveryRegion ?? "",
          location: profile.deliveryLocation ?? "",
          landmark: profile.deliveryLandmark ?? "",
          latitude: profile.deliveryLatitude
            ? Number(profile.deliveryLatitude)
            : undefined,
          longitude: profile.deliveryLongitude
            ? Number(profile.deliveryLongitude)
            : undefined,
        });
      } catch {
        setCustomerName(user.name ?? "");
      }
    };

    void loadProfile();
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to cart…</p>
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: "/checkout" });
    } catch {
      toast.error("Could not start sign in");
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!delivery.region || !delivery.location.trim()) {
      toast.error("Please enter your delivery region and location");
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          deliveryAddress: delivery,
          paymentMethod,
          subtotal: totalPrice,
          deliveryFee: DELIVERY_FEE,
          total,
          items: items.map((item) => ({
            id: String(item.id),
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Checkout failed");
        setIsProcessing(false);
        return;
      }

      clearCart();

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
        return;
      }

      router.push(`/order-confirmation?orderId=${data.order.id}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Link>

          <h1 className="mb-2 font-serif text-4xl font-bold text-heading md:text-5xl">
            Checkout
          </h1>
          <p className="mb-8 text-muted-foreground">
            Delivery across Ghana · Pay with Mobile Money or card via Paystack
          </p>

          {isPending ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !user ? (
            <Card className="mx-auto max-w-md">
              <CardHeader className="text-center">
                <CardTitle>Sign in to complete your order</CardTitle>
                <CardDescription>
                  Browse and add to cart without an account. When you&apos;re ready
                  to pay, sign in with Google so we can save your order and delivery
                  details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GoogleIcon className="h-5 w-5" />
                  )}
                  Continue with Google
                </Button>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Your details</CardTitle>
                      <CardDescription>
                        Signed in as {user.email}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="customerName">Full name</Label>
                        <Input
                          id="customerName"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="e.g. Kwame Mensah"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="customerPhone">Phone (MoMo / calls)</Label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. 024 123 4567"
                          required
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Used for delivery updates and Paystack payment
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Delivery address
                      </CardTitle>
                      <CardDescription>
                        Where should we deliver your order?
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DeliveryLocationPicker
                        value={delivery}
                        onChange={setDelivery}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment
                      </CardTitle>
                      <CardDescription>
                        Secure payment powered by Paystack
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup
                        value={paymentMethod}
                        onValueChange={(v) =>
                          setPaymentMethod(v as "card" | "momo")
                        }
                      >
                        <label
                          htmlFor="momo"
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <RadioGroupItem value="momo" id="momo" />
                          <Smartphone className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Mobile Money</p>
                            <p className="text-sm text-muted-foreground">
                              MTN, Telecel, AirtelTigo via Paystack
                            </p>
                          </div>
                        </label>
                        <label
                          htmlFor="card"
                          className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <RadioGroupItem value="card" id="card" />
                          <CreditCard className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">Debit / Credit card</p>
                            <p className="text-sm text-muted-foreground">
                              Visa, Mastercard on Paystack
                            </p>
                          </div>
                        </label>
                      </RadioGroup>

                      <p className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        You&apos;ll complete payment on Paystack&apos;s secure page
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <div className="sticky top-24 rounded-lg border border-border p-6">
                    <h2 className="mb-6 font-serif text-2xl font-bold">
                      Order summary
                    </h2>

                    <div className="mb-6 max-h-64 space-y-3 overflow-y-auto">
                      {items.map((item) => (
                        <div key={item.id} className="flex gap-3">
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-secondary/20">
                            <Image
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-medium">
                              {item.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mb-4 space-y-2 border-t border-border pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>{formatPrice(totalPrice)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery</span>
                        <span>
                          {DELIVERY_FEE > 0
                            ? formatPrice(DELIVERY_FEE)
                            : "Confirmed on call"}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6 border-t border-border pt-4">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing…
                        </>
                      ) : paymentMethod === "momo" ? (
                        "Pay with Mobile Money"
                      ) : (
                        "Pay with Card"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
