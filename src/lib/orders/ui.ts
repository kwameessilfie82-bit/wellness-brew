/** Client-safe presentation helpers shared by the orders inbox and the dashboard. */

export function statusTone(status: string): string {
  switch (status) {
    case "awaiting_customer":
    case "received":
    case "delivery_failed":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
    case "confirmed":
    case "preparing":
    case "ready_for_pickup":
    case "out_for_delivery":
      return "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200";
    case "delivered":
    case "picked_up":
    case "completed":
      return "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function paymentTone(p: string): string {
  switch (p) {
    case "pending_verification":
      return "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200";
    case "paid":
      return "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200";
    case "refund_due":
      return "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function relativeTime(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
