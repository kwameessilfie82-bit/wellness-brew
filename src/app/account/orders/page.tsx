"use client";

import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { useCurrentUser } from "@/lib/auth-client";
import { formatPrice } from "@/lib/format";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string | null;
  total: number;
  createdAt: string;
  deliveryAddress: { region?: string; location?: string };
  items: OrderItem[];
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, isPending } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      router.replace(`/auth/sign-in?next=${encodeURIComponent("/account/orders")}`);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/account/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isPending, user, router]);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_payment: "Awaiting payment",
      processing: "Processing",
      shipped: "Out for delivery",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return map[status] ?? status;
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/account"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Account
          </Link>

          <h1 className="mb-8 font-serif text-4xl font-bold md:text-5xl">
            Order History
          </h1>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <h2 className="mb-2 text-xl font-semibold">No orders yet</h2>
                <p className="mb-6 text-muted-foreground">
                  Start shopping to see your orders here
                </p>
                <Button asChild>
                  <Link href="/shop">Browse shop</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="mb-1 text-lg">
                          {order.orderNumber}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-GH", {
                            dateStyle: "medium",
                          })}
                        </p>
                        {order.deliveryAddress?.location ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Deliver to: {order.deliveryAddress.location}
                            {order.deliveryAddress.region
                              ? `, ${order.deliveryAddress.region}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 space-y-3">
                      {order.items.map((item) => (
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
                            <p className="line-clamp-1 font-medium">{item.name}</p>
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
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold">
                        {formatPrice(order.total)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="mt-4 w-full bg-transparent sm:w-auto"
                      asChild
                    >
                      <Link href={`/order-confirmation?orderId=${order.id}`}>
                        View details
                      </Link>
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
  );
}
