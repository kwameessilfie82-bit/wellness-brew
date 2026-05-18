"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `/api/paystack/verify?reference=${encodeURIComponent(reference)}`,
        );
        const data = await res.json();

        if (res.ok && data.orderId) {
          router.replace(`/order-confirmation?orderId=${data.orderId}`);
          return;
        }

        setError(data.error ?? "Payment verification failed");
      } catch {
        setError(
          "Could not verify payment. Contact support if you were charged.",
        );
      }
    };

    void verify();
  }, [reference, router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      {error ? (
        <>
          <p className="text-lg font-semibold text-destructive">{error}</p>
          <p className="text-sm text-muted-foreground">
            Reference: {reference}
          </p>
        </>
      ) : (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Confirming your payment…</p>
        </>
      )}
    </div>
  );
}

export default function CheckoutVerifyPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          }
        >
          <VerifyContent />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
