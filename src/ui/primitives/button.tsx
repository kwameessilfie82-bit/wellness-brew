"use client";

import type * as React from "react";
import { useFormStatus } from "react-dom";

import { Slot } from "@radix-ui/react-slot";
import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

import { buttonVariants } from "./button-variants";

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * Shows a spinner and blocks clicks while async work runs. Also implied by
     * `aria-busy`, and automatic for submit buttons while their <form action>
     * is pending. Use it on every button that starts a request.
     */
    loading?: boolean;
  };

function Button({ asChild = false, className, size, variant, loading, disabled, children, ...props }: ButtonProps) {
  const form = useFormStatus();
  const busy =
    Boolean(loading) ||
    props["aria-busy"] === true ||
    props["aria-busy"] === "true" ||
    (props.type === "submit" && form.pending);

  if (asChild) {
    return (
      <Slot className={cn(buttonVariants({ className, size, variant }))} data-slot="button" {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ className, size, variant }), busy && "cursor-wait [&>svg:not(.animate-spin)]:hidden")}
      data-slot="button"
      data-loading={busy || undefined}
      disabled={disabled || busy}
      {...props}
      aria-busy={busy || undefined}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export { Button, buttonVariants };
