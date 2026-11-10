"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut as supabaseSignOut } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { useMounted } from "@/lib/hooks/use-mounted";
import { Button, buttonVariants } from "@/ui/primitives/button";
import { Skeleton } from "@/ui/primitives/skeleton";

export function SignOutPageClient() {
  const router = useRouter();
  const mounted = useMounted();
  const [signingOut, setSigningOut] = useState(false);

  const handlePageBack = async () => {
    router.back();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabaseSignOut();
      router.push("/");
    } catch (err) {
      setSigningOut(false);
      throw err;
    }
  };

  return (
    <div
      className={`
        flex w-auto flex-col-reverse justify-center gap-2
        sm:flex-row
      `}
    >
      <Button onClick={handlePageBack} size="default" variant="outline" disabled={signingOut}>
        Go back
        <span className="sr-only">Previous page</span>
      </Button>
      {mounted ? (
        <Button onClick={handleSignOut} size="default" variant="secondary" loading={signingOut}>
          Log out
          <span className="sr-only">
            This action will log you out of your account.
          </span>
        </Button>
      ) : (
        <Skeleton
          className={cn(
            buttonVariants({ size: "default", variant: "secondary" }),
            "bg-muted text-muted-foreground",
          )}
        >
          Log out
        </Skeleton>
      )}
    </div>
  );
}
