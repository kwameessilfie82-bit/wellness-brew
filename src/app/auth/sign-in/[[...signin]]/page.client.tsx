"use client";

import Image from "next/image";
// import { useRouter } from "next/navigation"; // Not used currently
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { SEO_CONFIG } from "@/app";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth-client";
import {
  backupCartForCheckout,
  readCartFromStorage,
} from "@/lib/cart-storage";
import { GoogleIcon } from "@/ui/components/icons/google";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent } from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { PasswordInput } from "@/ui/primitives/password-input";
import { Separator } from "@/ui/primitives/separator";
import { Loader2 } from "lucide-react";

export function SignInPageClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailLoading(true);
    try {
      if (next === "/checkout" || next.startsWith("/checkout?")) {
        backupCartForCheckout(readCartFromStorage());
      }
      await signInWithEmail(email, password);
      window.location.href = next;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign in with email",
      );
      setEmailLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      if (next === "/checkout" || next.startsWith("/checkout?")) {
        backupCartForCheckout(readCartFromStorage());
      }
      signInWithGoogle(`/auth/callback?next=${encodeURIComponent(next)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with Google";
      if (
        message.includes("provider is not enabled") ||
        message.includes("Unsupported provider")
      ) {
        setError(
          "Google sign-in is not enabled in your Supabase project. In the Supabase dashboard go to Authentication → Providers, enable Google, and add your Google OAuth client ID and secret.",
        );
      } else {
        setError(message);
      }
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="container mx-auto px-4 py-16 flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-2">
                <Image src="/leafyvibestea.png" alt="" width={120} height={120} />

              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                Sign in to continue to {SEO_CONFIG.fullName}.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <form className="mt-6 grid gap-4" onSubmit={handleEmailLogin}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={emailLoading}
              >
                {emailLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">OR</span>
              <Separator className="flex-1" />
            </div>

            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={handleGoogleLogin}
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

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <a href="/auth/sign-up" className="font-medium text-primary hover:underline">
                Sign up
              </a>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              By continuing, you agree to our terms and privacy policy.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
