"use client";

import { ErrorState } from "@/ui/components/error-state";

export default function AccountError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState {...props} homeHref="/account" homeLabel="Back to account" />;
}
