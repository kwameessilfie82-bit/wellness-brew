import { ShieldCheck } from "lucide-react";

import { FDA_LABEL } from "@/lib/compliance/fda";
import { cn } from "@/lib/cn";

/** "FDA Ghana registered · <number>". Renders nothing without a number. */
export function FdaBadge({
  number,
  size = "md",
  className,
}: {
  number: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!number) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-emerald-600/30 bg-emerald-50 font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-300",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        className,
      )}
      title={`${FDA_LABEL}: ${number}`}
    >
      <ShieldCheck className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      <span>
        {FDA_LABEL}
        {size === "md" ? <> · <span className="font-mono">{number}</span></> : null}
      </span>
    </span>
  );
}
