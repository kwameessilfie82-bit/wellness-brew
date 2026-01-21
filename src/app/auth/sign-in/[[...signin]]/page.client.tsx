"use client";

import Image from "next/image";
// import { useRouter } from "next/navigation"; // Not used currently
import { useState } from "react";

import { SEO_CONFIG } from "@/app";
import { signIn } from "@/lib/auth-client";
import { GoogleIcon } from "@/ui/components/icons/google";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent } from "@/ui/primitives/card";
import { Loader2 } from "lucide-react";

export function SignInPageClient() {
  // const router = useRouter(); // Not used currently
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Email/password sign-in temporarily disabled for this project
  // const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  // const handleEmailLogin = async (e: React.FormEvent) => { /* ... */ };

  const handleGoogleLogin = () => {
    setLoading(true);
    try {
      void signIn.social({ provider: "google" });
    } catch (err) {
      setError("Failed to sign in with Google");
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
                Sign in to continue to {SEO_CONFIG.fullName}. Only Google sign-in is enabled for now.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <Button
                size="lg"
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                disabled={loading}
                onClick={handleGoogleLogin}
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

              {/* Email/password form disabled */}
              {/**
              <form className="space-y-4 mt-4" onSubmit={handleEmailLogin}>...</form>
              */}
            </div>

            <div className="mt-8 text-center text-xs text-muted-foreground">
              By continuing, you agree to our terms and privacy policy.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
