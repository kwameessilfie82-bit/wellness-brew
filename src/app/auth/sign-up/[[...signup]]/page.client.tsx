"use client";

import Image from "next/image";
// import Link from "next/link";
import { useState } from "react";

import { SEO_CONFIG } from "@/app";
import { signInWithGoogle, useCurrentUser } from "@/lib/auth-client";
import { GoogleIcon } from "@/ui/components/icons/google";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent } from "@/ui/primitives/card";
// import { Input } from "@/ui/primitives/input";
// import { PasswordInput } from "@/ui/primitives/password-input";
// import { Label } from "@/ui/primitives/label";
// import { Separator } from "@/ui/primitives/separator";
import { Loader2 } from "lucide-react";

export function SignUpPageClient() {
  const { user } = useCurrentUser();
  // Email/password sign-up disabled; we only show Google sign-up
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // const handleSubmit = (e: React.FormEvent) => { /* disabled */ };

  // GitHub sign up removed

  const handleGoogleSignUp = () => {
    setLoading(true);
    try {
      // If user is already authenticated, check role and route accordingly
      if (user) {
        (async () => {
          try {
            const res = await fetch("/api/admin/me");
            if (res.ok) {
              const data = await res.json();
              if (data?.isAdmin && data?.role?.name) {
                if (data.role.name === "manager") {
                  window.location.href = "/admin";
                } else {
                  window.location.href = "/admin/inventory";
                }
                return;
              }
            }
            // Not an admin – send to pending
            window.location.href = "/auth/pending";
          } catch {
            window.location.href = "/";
          }
        })();
        return;
      }
      // For new auth, let home route decide post-auth destination
      void signInWithGoogle("/auth/callback?next=/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign up with Google";
      if (
        message.includes("provider is not enabled") ||
        message.includes("Unsupported provider")
      ) {
        setError(
          "Google sign-in is not enabled in your Supabase project. Enable it under Authentication → Providers in the Supabase dashboard.",
        );
      } else {
        setError(message);
      }
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div
      className={`
        grid h-screen w-screen
        md:grid-cols-2
      `}
    >
      {/* Left side - Image */}
      <div
        className={`
          relative hidden
          md:block
        `}
      >
        <Image
          alt="Variety of health and nutrition products"
          className="object-cover"
          fill
          priority
          sizes="(max-width: 768px) 0vw, 50vw"
          src="/variety-gift.jpg"
        />
        <div
          className={`
            absolute inset-0 bg-gradient-to-t from-background/80 to-transparent
          `}
        />
        <div className="absolute bottom-8 left-8 z-10 text-white">
          <h1 className="text-3xl font-bold">{SEO_CONFIG.name}</h1>
          <p className="mt-2 max-w-md text-sm text-white/80">
            {SEO_CONFIG.slogan}
          </p>
        </div>
      </div>

      {/* Right side - Sign up form (Google only) */}
      <div
        className={`
          flex items-center justify-center p-4
          md:p-8
        `}
      >
        <div className="w-full max-w-md space-y-4">
          <div
            className={`
              space-y-4 text-center
              md:text-left
            `}
          >
            <h2 className="text-3xl font-bold">Create your account</h2>
            <p className="text-sm text-muted-foreground">Sign up quickly with Google to continue.</p>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="pt-2">
              {error && (
                <div className="text-sm font-medium text-destructive mb-3">{error}</div>
              )}
              <Button
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                disabled={loading}
                onClick={handleGoogleSignUp}
                variant="default"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting to Google...
                  </>
                ) : (
                  <>
                    <GoogleIcon className="h-5 w-5" />
                    Continue with Google
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
