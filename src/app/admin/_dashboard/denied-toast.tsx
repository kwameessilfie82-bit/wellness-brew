"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

/** Shows a one-off "no access" toast when a guarded page bounced the user to /admin?denied=... */
export function DeniedToast({ denied }: { denied: string }) {
  const router = useRouter();

  useEffect(() => {
    toast.error("You don't have access to that page.", {
      description: "Ask a manager if you need it.",
      id: "admin-denied",
    });
    // Drop the flag so a refresh doesn't repeat the toast.
    router.replace("/admin");
  }, [denied, router]);

  return null;
}
