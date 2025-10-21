"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { User } from "@/db/schema/users/types";
// Paystack subscription type
type SubscriptionLike = { 
  id: string; 
  productId: string; 
  subscriptionId: string; 
  status: string;
  amount?: number;
  nextPaymentDate?: string;
};

// PaystackPaymentForm component not available - using placeholder
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Alert, AlertDescription, AlertTitle } from "@/ui/primitives/alert";
import { Skeleton } from "@/ui/primitives/skeleton";
import { Badge } from "@/ui/primitives/badge";

interface SubscriptionsResponse {
  subscriptions: SubscriptionLike[];
}

interface BillingPageClientProps {
  user: User | null;
}

export function BillingPageClient({ user }: BillingPageClientProps) {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<SubscriptionLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // no customer state needed here; subscriptions drive UI

  useEffect(() => {
    if (!user) {
      router.push("/auth/sign-in");
      return;
    }

    const fetchSubscriptions = async () => {
      try {
        const response = await fetch("/api/payments/subscriptions");
        if (!response.ok) {
          throw new Error("Failed to fetch subscriptions");
        }
        const data = await response.json() as SubscriptionsResponse;
        setSubscriptions(data.subscriptions || []);
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        setError("Failed to load subscription data. Please try again.");
      }
    };

    fetchSubscriptions().finally(() => setLoading(false));
  }, [user, router]);

  const hasActiveSubscription = subscriptions.some(sub => sub.status === "active");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get("payment");
    // const reference = urlParams.get("reference"); // not used in UI
    
    if (payment === "success") {
      // Show success message
      setError(null);
      // Refresh the page to show updated subscription status
      router.refresh();
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (payment === "failed") {
      setError("Payment failed. Please try again.");
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (payment === "error") {
      const message = urlParams.get("message");
      setError(message || "Payment error occurred. Please try again.");
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Billing</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Billing</h1>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Status */}
      <div className="grid gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Your current subscription plan and status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{subscription.productId}</h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {subscription.subscriptionId}
                      </p>
                      {subscription.amount && (
                        <p className="text-sm text-muted-foreground">
                          Amount: GHS {(subscription.amount / 100).toFixed(2)}
                        </p>
                      )}
                      {subscription.nextPaymentDate && (
                        <p className="text-sm text-muted-foreground">
                          Next Payment: {new Date(subscription.nextPaymentDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={subscription.status === "active" ? "default" : "outline"}>
                      {subscription.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">You don&#39;t have any active subscriptions.</p>
            )}
          </CardContent>
          <CardFooter>
            {hasActiveSubscription && (
              <Button variant="outline" onClick={() => router.push("/dashboard/billing")}>
                View Subscription Details
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Payment Plans */}
      {!hasActiveSubscription && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
              <CardDescription>Get access to all premium features and priority support.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS 50.00</div>
              <p className="text-sm text-muted-foreground">per month</p>
            </CardContent>
            <CardFooter>
              <Button disabled className="w-full">
                Subscribe to Pro (Coming Soon)
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Premium Plan</CardTitle>
              <CardDescription>Everything in Pro plus exclusive content and early access to new features.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS 100.00</div>
              <p className="text-sm text-muted-foreground">per month</p>
            </CardContent>
            <CardFooter>
              <Button disabled className="w-full">
                Subscribe to Premium (Coming Soon)
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* One-time Payment */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">One-time Payment</h2>
        <div className="max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Make a Payment</CardTitle>
              <CardDescription>Support our pharmacy platform with a one-time payment.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS 25.00</div>
            </CardContent>
            <CardFooter>
              <Button disabled className="w-full">
                Pay Now (Coming Soon)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
