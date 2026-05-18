import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SYSTEM_CONFIG } from "@/app";
import { getCurrentUser } from "@/lib/auth";

import { SignInPageClient } from "./page.client";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();

  if (user) {
    redirect(next && next.startsWith("/") ? next : SYSTEM_CONFIG.redirectAfterSignIn);
  }

  return (
    <Suspense fallback={null}>
      <SignInPageClient />
    </Suspense>
  );
}
