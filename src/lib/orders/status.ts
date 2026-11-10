/**
 * WhatsApp-order lifecycle. Client + server safe (no DB imports).
 *
 * Two independent axes: `status` (fulfilment lifecycle) and `paymentStatus`.
 * An order is `completed` once it is delivered/picked up AND paid; that
 * promotion happens server-side whenever either axis changes.
 */

export const ORDER_STATUSES = [
  "awaiting_customer",
  "received",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivery_failed",
  "delivered",
  "picked_up",
  "completed",
  "cancelled",
  "expired",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending_verification",
  "partially_paid",
  "paid",
  "refund_due",
  "refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILMENTS = ["delivery", "pickup"] as const;
export type Fulfilment = (typeof FULFILMENTS)[number];

export const PAYMENT_METHODS = ["momo", "bank", "cash_on_delivery"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const CANCEL_REASONS = [
  "customer_request",
  "out_of_stock",
  "no_response",
  "duplicate",
  "payment_not_received",
  "other",
] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

export const CANCEL_REASON_LABELS: Record<CancelReason | "legacy_unpaid" | "expired", string> = {
  customer_request: "Cancelled at your request",
  out_of_stock: "Out of stock",
  no_response: "We couldn't reach you",
  duplicate: "Duplicate order",
  payment_not_received: "Payment not received",
  other: "Cancelled",
  legacy_unpaid: "Payment was not completed",
  expired: "Not sent on WhatsApp in time",
};

/** Statuses that count as "goods handed over". */
export const HANDED_OVER: readonly OrderStatus[] = ["delivered", "picked_up", "completed"];
/** Terminal: no further staff transitions except logged undo. */
export const TERMINAL: readonly OrderStatus[] = ["completed", "cancelled", "expired", "returned"];
/** Stock is deducted when entering one of these from a pre-confirmation status. */
export const STOCK_HELD: readonly OrderStatus[] = [
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "out_for_delivery",
  "delivery_failed",
  "delivered",
  "picked_up",
  "completed",
];
/** Items and delivery details can be edited by staff only in these statuses. */
export const EDITABLE: readonly OrderStatus[] = ["awaiting_customer", "received", "confirmed", "preparing", "ready_for_pickup"];
/** The customer may cancel from the order page only before confirmation. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ["awaiting_customer", "received"];

/**
 * Allowed staff transitions. Anything not listed is rejected server-side.
 * `completed` is never chosen directly; it is derived (see deriveCompletion).
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_customer: ["received", "confirmed", "cancelled", "expired"],
  received: ["confirmed", "cancelled"],
  confirmed: ["preparing", "ready_for_pickup", "out_for_delivery", "cancelled"],
  preparing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["out_for_delivery", "returned", "cancelled"],
  delivered: ["returned"],
  picked_up: ["returned"],
  completed: ["returned"],
  cancelled: [],
  expired: ["awaiting_customer"],
  returned: [],
};

/** Logged "undo" moves for staff mistakes (require a reason). */
export const UNDO_TRANSITIONS: Partial<Record<OrderStatus, readonly OrderStatus[]>> = {
  delivered: ["out_for_delivery"],
  picked_up: ["ready_for_pickup"],
  completed: ["out_for_delivery", "ready_for_pickup"],
  cancelled: ["received"],
  out_for_delivery: ["preparing"],
  ready_for_pickup: ["preparing"],
  preparing: ["confirmed"],
  confirmed: ["received"],
};

export function canTransition(from: OrderStatus, to: OrderStatus, opts?: { undo?: boolean }): boolean {
  if (ORDER_TRANSITIONS[from]?.includes(to)) return true;
  return !!opts?.undo && !!UNDO_TRANSITIONS[from]?.includes(to);
}

/** Fulfilment-aware filter: pickup orders never go out for delivery and vice versa. */
export function nextStatuses(from: OrderStatus, fulfilment: Fulfilment): OrderStatus[] {
  return ORDER_TRANSITIONS[from].filter((s) =>
    fulfilment === "pickup"
      ? !["out_for_delivery", "delivered", "delivery_failed"].includes(s)
      : !["ready_for_pickup", "picked_up"].includes(s),
  );
}

export function isPaidInFull(paymentStatus: PaymentStatus): boolean {
  return paymentStatus === "paid";
}

/** delivered/picked_up + paid -> completed. Returns the status to store. */
export function deriveCompletion(status: OrderStatus, paymentStatus: PaymentStatus): OrderStatus {
  if ((status === "delivered" || status === "picked_up") && isPaidInFull(paymentStatus)) return "completed";
  return status;
}

/** Staff-facing labels. */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_customer: "Not sent on WhatsApp yet",
  received: "Received on WhatsApp",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivery_failed: "Delivery failed",
  delivered: "Delivered",
  picked_up: "Picked up",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
  returned: "Returned",
};

/** Action-button labels for moving *to* a status. */
export const STATUS_ACTIONS: Record<OrderStatus, string> = {
  awaiting_customer: "Reopen order",
  received: "Got it on WhatsApp",
  confirmed: "Confirm order",
  preparing: "Start preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Send out for delivery",
  delivery_failed: "Delivery failed",
  delivered: "Mark delivered",
  picked_up: "Mark picked up",
  completed: "Complete",
  cancelled: "Cancel order",
  expired: "Mark expired",
  returned: "Mark returned",
};

/** Customer-facing headline + explanation for the order page. */
export const CUSTOMER_STATUS_COPY: Record<OrderStatus, { title: string; body: string }> = {
  awaiting_customer: {
    title: "Send your order on WhatsApp",
    body: "Your order is saved. Send it to us on WhatsApp so we can confirm it.",
  },
  received: { title: "We've got your order", body: "We're checking stock and delivery details." },
  confirmed: { title: "Order confirmed", body: "Your order is confirmed. Payment details are below." },
  preparing: { title: "Preparing your order", body: "We're packing your teas." },
  ready_for_pickup: { title: "Ready for pickup", body: "Your order is ready to collect." },
  out_for_delivery: {
    title: "On the way",
    body: "Your order is out for delivery. Give the rider your delivery code when it arrives.",
  },
  delivery_failed: {
    title: "We couldn't deliver your order",
    body: "Our rider couldn't reach you. Message us on WhatsApp to arrange a new time.",
  },
  delivered: { title: "Delivered", body: "Enjoy your tea!" },
  picked_up: { title: "Picked up", body: "Enjoy your tea!" },
  completed: { title: "Completed", body: "Thank you for your order. Enjoy your tea!" },
  cancelled: { title: "Order cancelled", body: "This order was cancelled." },
  expired: {
    title: "This order expired",
    body: "It wasn't sent to us on WhatsApp in time. You can start a new order with the same items.",
  },
  returned: { title: "Returned", body: "This order was returned." },
};

/** The customer-facing progress steps (in order) for a fulfilment type. */
export function customerSteps(fulfilment: Fulfilment): { key: OrderStatus; label: string }[] {
  return fulfilment === "pickup"
    ? [
        { key: "awaiting_customer", label: "Sent" },
        { key: "received", label: "Received" },
        { key: "confirmed", label: "Confirmed" },
        { key: "ready_for_pickup", label: "Ready" },
        { key: "picked_up", label: "Picked up" },
      ]
    : [
        { key: "awaiting_customer", label: "Sent" },
        { key: "received", label: "Received" },
        { key: "confirmed", label: "Confirmed" },
        { key: "out_for_delivery", label: "On the way" },
        { key: "delivered", label: "Delivered" },
      ];
}

const STEP_RANK: Partial<Record<OrderStatus, number>> = {
  awaiting_customer: 0,
  received: 1,
  confirmed: 2,
  preparing: 2,
  ready_for_pickup: 3,
  out_for_delivery: 3,
  delivery_failed: 3,
  delivered: 4,
  picked_up: 4,
  completed: 4,
};

/** Index of the current step in customerSteps(), or -1 for off-path statuses. */
export function customerStepIndex(status: OrderStatus): number {
  return STEP_RANK[status] ?? -1;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending_verification: "Customer says paid — verify",
  partially_paid: "Part paid",
  paid: "Paid",
  refund_due: "Refund due",
  refunded: "Refunded",
};

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}
export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return typeof v === "string" && (PAYMENT_STATUSES as readonly string[]).includes(v);
}
