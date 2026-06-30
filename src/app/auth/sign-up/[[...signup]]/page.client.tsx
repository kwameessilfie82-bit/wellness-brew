"use client";

import Image from "next/image";
// import Link from "next/link";
import { useState } from "react";

import { SEO_CONFIG } from "@/app";
import {
  signInWithGoogle,
  signUpWithEmail,
  useCurrentUser,
} from "@/lib/auth-client";
import { GoogleIcon } from "@/ui/components/icons/google";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent } from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { PasswordInput } from "@/ui/primitives/password-input";
import { Label } from "@/ui/primitives/label";
import { Separator } from "@/ui/primitives/separator";
import { Loader2 } from "lucide-react";

export function SignUpPageClient() {
  const { user } = useCurrentUser();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailLoading(true);
    try {
      const { session } = await signUpWithEmail(email, password, name.trim());
      // With email confirmations disabled (local), a session is returned immediately.
      if (session) {
        window.location.href = "/";
      } else {
        setError(
          "Check your email to confirm your account before signing in.",
        );
        setEmailLoading(false);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign up with email",
      );
      setEmailLoading(false);
    }
  };

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
            <p className="text-sm text-muted-foreground">Sign up with your email or Google to continue.</p>
          </div>

          <Card className="border-none shadow-sm">
            <CardContent className="pt-2">
              {error && (
                <div className="text-sm font-medium text-destructive mb-3">{error}</div>
              )}

              <form className="grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>
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
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={emailLoading}>
                  {emailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">OR</span>
                <Separator className="flex-1" />
              </div>

              <Button
                className="w-full gap-2"
                disabled={loading}
                onClick={handleGoogleSignUp}
                variant="outline"
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
                Already have an account?{" "}
                <a href="/auth/sign-in" className="font-medium text-primary hover:underline">
                  Sign in
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
