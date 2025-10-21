"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/ui/primitives/button";

export default function PendingVerificationPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const checkAccess = async () => {
    setChecking(true);
    try {
      // Go through the home route which contains the role-based redirects
      router.push("/");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Optional: auto-check on mount after a short delay
    const t = setTimeout(() => {
      // noop by default; user can click manually
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-4">
        <h1 className="text-2xl font-bold">Registration Received</h1>
        <p className="text-muted-foreground">
          Your account has been created and is awaiting verification by a manager.
        </p>
        <p className="text-sm text-muted-foreground">
          If you need urgent access, please contact your manager.
        </p>
        <div className="pt-2">
          <Button onClick={checkAccess} disabled={checking}>
            {checking ? "Checking..." : "Check access"}
          </Button>
        </div>
      </div>
    </div>
  );
}


