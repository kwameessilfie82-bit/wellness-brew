"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Copy, Download, ExternalLink, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/cn";
import { accuracyLabel, mapsUrl } from "@/lib/orders/location";
import { formatMoney, round2 } from "@/lib/orders/money";
import { formatLocalPhone } from "@/lib/orders/phone";
import {
  CANCEL_REASON_LABELS,
  CANCEL_REASONS,
  EDITABLE,
  type Fulfilment,
  nextStatuses,
  type OrderStatus,
  PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  type PaymentMethod,
  type PaymentStatus,
  STATUS_ACTIONS,
  STATUS_LABELS,
  UNDO_TRANSITIONS,
} from "@/lib/orders/status";
import { Button } from "@/ui/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/primitives/dialog";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";

import {
  addOrderNote,
  assignOrder,
  changeOrderStatus,
  createRiderLink,
  markRefunded,
  prepareMessage,
  recordPayment,
  rejectPaymentClaim,
  rotateCustomerLink,
  setDeliveryFee,
  updateOrderItems,
} from "../actions";

/* ───────────── types ───────────── */

type Order = {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentStatus: string;
  version: number;
  customerName: string;
  customerPhone: string | null;
  customerPhoneE164: string | null;
  customerEmail: string | null;
  fulfilment: string;
  shippingAddress: string | null;
  deliveryArea: string | null;
  gpsAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  locationAccuracyM: number | null;
  deliveryFeeConfirmed: boolean;
  pickupLocationName: string | null;
  deliveryWindow: string | null;
  isGift: boolean;
  recipientName: string | null;
  recipientPhone: string | null;
  giftMessage: string | null;
  preferredPayment: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  amountPaid: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string | null;
  deliveryCode: string | null;
  riderFailedAttempts: number;
  deliveredAt: string | null;
  deliveryProof: string | null;
  assignedTo: string | null;
  cancelReason: string | null;
  attentionReason: string | null;
  createdAt: string;
};
type Item = { id: string; productId: string | null; name: string; price: number; quantity: number };
type EventRow = {
  id: string;
  type: string;
  fromStatus: string | null;
  toStatus: string | null;
  data: Record<string, unknown> | null;
  actorType: string;
  actorName: string | null;
  createdAt: string;
};
type OtherOrder = { id: string; orderNumber: string; status: string; total: number; createdAt: string };
type Product = { id: string; name: string; price: number };

type Props = {
  order: Order;
  items: Item[];
  events: EventRow[];
  otherOrders: OtherOrder[];
  staff: { id: string; name: string }[];
  products: Product[];
  templateLabels: Record<string, string>;
  customerLink: string | null;
};

type ActionResult = { ok: true } | { ok: false; error: string; code?: string };

const METHOD_LABELS: Record<PaymentMethod, string> = {
  momo: "Mobile Money",
  bank: "Bank transfer",
  cash_on_delivery: "Cash on delivery",
};
const PROOF_LABELS: Record<string, string> = { rider_code: "Rider code", staff: "Staff", customer: "Customer" };

const inputCls =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";
const bigBtn = "h-12 text-base";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function statusTone(status: string): string {
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

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3 rounded-xl border bg-card p-4 shadow-xs", className)}>
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function copyText(text: string, label = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch {
    toast.error("Couldn't copy");
  }
}

/* ───────────── main ───────────── */

export function OrderDetail(props: Props) {
  const { order, items, events, otherOrders, staff, products, templateLabels, customerLink } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which button started the running action: only that one shows as busy; the
  // rest stay blocked (no double submits) but don't fade, so it's clear what was pressed.
  const lastPressed = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      lastPressed.current = (e.target as Element | null)?.closest?.("button") ?? null;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const status = order.status as OrderStatus;
  const fulfilment = order.fulfilment as Fulfilment;
  const paymentStatus = order.paymentStatus as PaymentStatus;
  const isDelivery = fulfilment === "delivery";
  const editable = EDITABLE.includes(status);
  const due = Math.max(0, round2(order.total - order.amountPaid));

  /** Run a server action; toast + refresh. Resolves true on success. */
  function run(fn: () => Promise<ActionResult>, success: string | (() => string), after?: (ok: boolean) => void) {
    const busy = lastPressed.current;
    lastPressed.current = null;
    busy?.setAttribute("data-busy", "");
    startTransition(async () => {
      const r = await fn().finally(() => busy?.removeAttribute("data-busy"));
      if (r.ok) {
        toast.success(typeof success === "function" ? success() : success);
        router.refresh();
      } else {
        toast.error(r.error);
        if (r.code === "conflict") router.refresh();
      }
      after?.(r.ok);
    });
  }

  const claim = events.find((e) => e.type === "payment_claimed");
  const claimRef = typeof claim?.data?.reference === "string" ? (claim.data.reference as string) : "";

  return (
    <div
      data-pending={pending || undefined}
      className="space-y-4 pb-24 [&[data-pending]_button:disabled:not([data-busy])]:cursor-wait [&[data-pending]_button:disabled:not([data-busy])]:opacity-100 [&_button[data-busy]]:animate-pulse"
    >
      {/* Header */}
      <div className="space-y-2">
        <Link href="/admin/orders" className="inline-flex h-10 items-center text-sm text-muted-foreground hover:text-foreground">
          ← Orders
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
          <span className={cn("rounded-md px-2 py-1 text-xs font-medium", statusTone(order.status))}>
            {STATUS_LABELS[status] ?? order.status}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium",
              paymentStatus === "pending_verification"
                ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
                : paymentStatus === "paid"
                  ? "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {PAYMENT_STATUS_LABELS[paymentStatus] ?? order.paymentStatus}
          </span>
          {order.channel === "web_paystack_legacy" ? (
            <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">Legacy web order</span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">Placed {fmtTime(order.createdAt)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Main column */}
        <div className="space-y-4">
          <StatusCard order={order} status={status} fulfilment={fulfilment} pending={pending} run={run} />
          <WhatsAppCard order={order} status={status} fulfilment={fulfilment} templateLabels={templateLabels} />
          <ItemsCard
            order={order}
            items={items}
            products={products}
            editable={editable}
            isDelivery={isDelivery}
            due={due}
            pending={pending}
            run={run}
          />
          <TimelineCard orderId={order.id} events={events} staff={staff} templateLabels={templateLabels} pending={pending} run={run} />
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <CustomerCard order={order} otherOrders={otherOrders} isDelivery={isDelivery} />
          <PaymentCard
            order={order}
            paymentStatus={paymentStatus}
            due={due}
            claimRef={claimRef}
            pending={pending}
            run={run}
          />
          {isDelivery ? <DeliveryCard order={order} pending={pending} run={run} /> : null}
          <Card title="Handled by">
            <NativeSelect
              className="h-11 w-full text-base"
              value={order.assignedTo ?? ""}
              disabled={pending}
              onChange={(e) => run(() => assignOrder(order.id, e.target.value || null), "Assigned")}
            >
              <NativeSelectOption value="">Unassigned</NativeSelectOption>
              {staff.map((s) => (
                <NativeSelectOption key={s.id} value={s.id}>
                  {s.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Card>
          {customerLink ? (
            <InvoiceCard
              invoiceUrl={`${customerLink}/invoice`}
              orderNumber={order.orderNumber}
              customerName={order.customerName}
              phone={order.customerPhoneE164}
              confirmed={!["awaiting_customer", "received"].includes(order.status)}
            />
          ) : null}
          <LinkCard orderId={order.id} customerLink={customerLink} pending={pending} run={run} />
        </div>
      </div>
    </div>
  );
}

type Run = (fn: () => Promise<ActionResult>, success: string | (() => string), after?: (ok: boolean) => void) => void;

/* ───────────── status / next step ───────────── */

function StatusCard({
  order,
  status,
  fulfilment,
  pending,
  run,
}: {
  order: Order;
  status: OrderStatus;
  fulfilment: Fulfilment;
  pending: boolean;
  run: Run;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [note, setNote] = useState("");
  const [undoTo, setUndoTo] = useState("");
  const [undoNote, setUndoNote] = useState("");

  const next = nextStatuses(status, fulfilment).filter((s) => s !== "cancelled" && s !== "expired");
  const canCancel = nextStatuses(status, fulfilment).includes("cancelled");
  const undoTargets = UNDO_TRANSITIONS[status] ?? [];
  const needsFee = fulfilment === "delivery" && !order.deliveryFeeConfirmed;

  function go(to: string, extra: { reason?: string; note?: string; undo?: boolean } = {}, allowNegativeStock = false) {
    run(
      async () => {
        const r = await changeOrderStatus({ orderId: order.id, to, expectedVersion: order.version, allowNegativeStock, ...extra });
        if (!r.ok && r.code === "stock" && window.confirm(r.error)) {
          return changeOrderStatus({ orderId: order.id, to, expectedVersion: order.version, allowNegativeStock: true, ...extra });
        }
        return r;
      },
      "Order updated",
      (ok) => {
        if (ok) {
          setCancelOpen(false);
          setUndoOpen(false);
          setNote("");
          setUndoNote("");
        }
      },
    );
  }

  if (next.length === 0 && !canCancel && undoTargets.length === 0) return null;

  return (
    <Card title="Next step">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {next.map((s, i) => {
          const blocked = s === "confirmed" && needsFee;
          return (
            <div key={s} className="flex flex-col gap-1">
              <Button
                type="button"
                className={cn(bigBtn, "sm:min-w-44")}
                variant={i === 0 ? "default" : "outline"}
                disabled={pending || blocked}
                onClick={() => go(s)}
              >
                {STATUS_ACTIONS[s]}
              </Button>
              {blocked ? <span className="text-xs text-amber-700 dark:text-amber-300">Set the delivery fee first</span> : null}
            </div>
          );
        })}
        {canCancel ? (
          <Button type="button" variant="destructive" className={bigBtn} disabled={pending} onClick={() => setCancelOpen(true)}>
            Cancel order
          </Button>
        ) : null}
      </div>
      {undoTargets.length > 0 ? (
        <button
          type="button"
          className="h-9 text-sm text-muted-foreground underline underline-offset-2"
          onClick={() => {
            setUndoTo(undoTargets[0]);
            setUndoOpen(true);
          }}
        >
          Undo last step
        </button>
      ) : null}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {order.orderNumber}?</DialogTitle>
            <DialogDescription>The customer won&apos;t be told automatically. Use the WhatsApp button after.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <NativeSelect className="h-11 w-full text-base" value={reason} onChange={(e) => setReason(e.target.value)}>
              {CANCEL_REASONS.map((r) => (
                <NativeSelectOption key={r} value={r}>
                  {CANCEL_REASON_LABELS[r]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <input className={inputCls} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Keep order
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={() => go("cancelled", { reason, note })}>
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={undoOpen} onOpenChange={setUndoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo last step</DialogTitle>
            <DialogDescription>Moves the order back. This is logged with your reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <NativeSelect className="h-11 w-full text-base" value={undoTo} onChange={(e) => setUndoTo(e.target.value)}>
              {undoTargets.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  Back to: {STATUS_LABELS[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <input
              className={inputCls}
              placeholder="Reason (required)"
              value={undoNote}
              onChange={(e) => setUndoNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUndoOpen(false)}>
              Close
            </Button>
            <Button type="button" disabled={pending || !undoNote.trim()} onClick={() => go(undoTo, { undo: true, note: undoNote })}>
              Undo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────────── one-tap WhatsApp ───────────── */

function WhatsAppCard({
  order,
  status,
  fulfilment,
  templateLabels,
}: {
  order: Order;
  status: OrderStatus;
  fulfilment: Fulfilment;
  templateLabels: Record<string, string>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const keys = [
    "received",
    "paymentDetails",
    status === "awaiting_customer" ? "nudge" : null,
    "confirmed",
    fulfilment === "pickup" ? "readyForPickup" : null,
    fulfilment === "delivery" ? "outForDelivery" : null,
    fulfilment === "delivery" ? "riderDispatch" : null,
    "delivered",
    "deliveryFailed",
    status === "cancelled" ? "cancelled" : null,
    "paymentReceived",
  ].filter((k): k is string => !!k);

  async function send(key: string) {
    setBusy(key);
    // Open synchronously so mobile popup blockers allow it, then point it at wa.me.
    const win = window.open("", "_blank");
    const r = await prepareMessage(order.id, key);
    setBusy(null);
    if (!r.ok) {
      win?.close();
      toast.error(r.error);
      return;
    }
    if (win) win.location.href = r.url;
    else window.open(r.url, "_blank");
  }

  async function copy(key: string) {
    setBusy(key);
    const r = await prepareMessage(order.id, key);
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    await copyText(r.text, "Message copied");
  }

  return (
    <Card title="Message on WhatsApp">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {keys.map((k) => (
          <div key={k} className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 justify-start gap-2 text-left whitespace-normal"
              disabled={busy !== null}
              onClick={() => send(k)}
            >
              <MessageCircle className="text-green-600" />
              {templateLabels[k] ?? k}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-12"
              aria-label={`Copy "${templateLabels[k] ?? k}" message`}
              disabled={busy !== null}
              onClick={() => copy(k)}
            >
              <Copy />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ───────────── customer ───────────── */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function CustomerCard({ order, otherOrders, isDelivery }: { order: Order; otherOrders: OtherOrder[]; isDelivery: boolean }) {
  const phone = order.customerPhoneE164 ?? order.customerPhone;
  const wa = order.customerPhoneE164 ? `https://wa.me/${order.customerPhoneE164.replace(/\D/g, "")}` : null;
  return (
    <Card title="Customer">
      <dl className="space-y-2">
        <Row label="Name">{order.customerName}</Row>
        <Row label="Phone">
          {phone ? (
            <span className="flex flex-wrap items-center gap-2">
              <a href={`tel:${phone}`} className="inline-flex h-10 items-center gap-1 font-medium text-primary">
                <Phone className="size-4" />
                {formatLocalPhone(order.customerPhoneE164) || phone}
              </a>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1 rounded-md border px-3 text-sm"
                >
                  <MessageCircle className="size-4 text-green-600" /> Chat
                </a>
              ) : null}
            </span>
          ) : (
            "—"
          )}
        </Row>
        {order.customerEmail ? <Row label="Email">{order.customerEmail}</Row> : null}
        {order.isGift ? (
          <>
            <Row label="Gift for">
              {order.recipientName ?? "—"}
              {order.recipientPhone ? ` · ${formatLocalPhone(order.recipientPhone)}` : ""}
            </Row>
            {order.giftMessage ? <Row label="Gift message">“{order.giftMessage}”</Row> : null}
          </>
        ) : null}
        {isDelivery ? (
          <>
            <Row label="Area">{order.deliveryArea ?? "—"}</Row>
            <Row label="Address">{order.shippingAddress ?? "—"}</Row>
            {order.gpsAddress ? <Row label="GPS">{order.gpsAddress}</Row> : null}
            {order.deliveryLat !== null && order.deliveryLng !== null ? (
              <Row label="Map pin">
                <a
                  href={mapsUrl(order.deliveryLat, order.deliveryLng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  Open in Google Maps <ExternalLink className="h-3 w-3" />
                </a>
                {order.locationAccuracyM ? (
                  <span className="text-muted-foreground"> · {accuracyLabel(order.locationAccuracyM)}</span>
                ) : null}
              </Row>
            ) : null}
            {order.deliveryWindow ? <Row label="Window">{order.deliveryWindow}</Row> : null}
          </>
        ) : (
          <Row label="Pickup">{order.pickupLocationName ?? "—"}</Row>
        )}
        {order.notes ? <Row label="Customer note">{order.notes}</Row> : null}
        {order.preferredPayment ? (
          <Row label="Prefers">{METHOD_LABELS[order.preferredPayment as PaymentMethod] ?? order.preferredPayment}</Row>
        ) : null}
      </dl>
      {otherOrders.length > 0 ? (
        <div className="border-t pt-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Other orders from this number</p>
          <ul className="space-y-1">
            {otherOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex h-10 items-center justify-between gap-2 text-sm hover:underline">
                  <span className="font-mono">{o.orderNumber}</span>
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[o.status as OrderStatus] ?? o.status} · {formatMoney(o.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

/* ───────────── items ───────────── */

type Line = { productId: string; name: string; quantity: number; price: number; override: string };

function ItemsCard({
  order,
  items,
  products,
  editable,
  isDelivery,
  due,
  pending,
  run,
}: {
  order: Order;
  items: Item[];
  products: Product[];
  editable: boolean;
  isDelivery: boolean;
  due: number;
  pending: boolean;
  run: Run;
}) {
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNote] = useState("");
  const [addId, setAddId] = useState("");
  const [fee, setFee] = useState(String(order.deliveryFee));

  const canEditItems = editable && items.every((i) => i.productId);

  function startEdit() {
    setLines(items.map((i) => ({ productId: i.productId!, name: i.name, quantity: i.quantity, price: i.price, override: "" })));
    setNote("");
    setEditing(true);
  }

  function addProduct() {
    const p = products.find((x) => x.id === addId);
    if (!p) return;
    setLines((cur) =>
      cur.some((l) => l.productId === p.id)
        ? cur.map((l) => (l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...cur, { productId: p.id, name: p.name, quantity: 1, price: p.price, override: "" }],
    );
    setAddId("");
  }

  function save() {
    run(
      () =>
        updateOrderItems({
          orderId: order.id,
          expectedVersion: order.version,
          note: note || undefined,
          items: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            ...(l.override.trim() && Number.isFinite(Number(l.override)) ? { price: Number(l.override) } : {}),
          })),
        }),
      "Items updated",
      (ok) => ok && setEditing(false),
    );
  }

  return (
    <Card title="Items">
      {editing ? (
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.productId} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{l.name}</p>
                <button
                  type="button"
                  className="h-9 px-2 text-sm text-destructive"
                  onClick={() => setLines((c) => c.filter((x) => x.productId !== l.productId))}
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Quantity
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    className={inputCls}
                    value={l.quantity}
                    onChange={(e) =>
                      setLines((c) =>
                        c.map((x) => (x.productId === l.productId ? { ...x, quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) } : x)),
                      )
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Price override (now {formatMoney(l.price)})
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="Keep"
                    className={inputCls}
                    value={l.override}
                    onChange={(e) => setLines((c) => c.map((x) => (x.productId === l.productId ? { ...x, override: e.target.value } : x)))}
                  />
                </label>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <NativeSelect className="h-11 w-full text-base" value={addId} onChange={(e) => setAddId(e.target.value)}>
              <NativeSelectOption value="">Add a product…</NativeSelectOption>
              {products.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.price)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="button" variant="outline" className="h-11" disabled={!addId} onClick={addProduct}>
              Add
            </Button>
          </div>
          <input className={inputCls} placeholder="Note about this change (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" className={cn(bigBtn, "flex-1")} disabled={pending || lines.every((l) => l.quantity <= 0)} onClick={save}>
              Save items
            </Button>
            <Button type="button" variant="outline" className={bigBtn} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <ul className="divide-y text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  {i.name}
                  <span className="block text-xs text-muted-foreground">
                    {i.quantity} × {formatMoney(i.price)}
                  </span>
                </span>
                <span className="shrink-0 font-medium">{formatMoney(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatMoney(order.subtotal)}</dd>
            </div>
            {isDelivery ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd>{order.deliveryFeeConfirmed ? formatMoney(order.deliveryFee) : "Not set yet"}</dd>
              </div>
            ) : null}
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Paid</dt>
              <dd>{formatMoney(order.amountPaid)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Due</dt>
              <dd>{formatMoney(due)}</dd>
            </div>
          </dl>
          {canEditItems ? (
            <Button type="button" variant="outline" className={cn(bigBtn, "w-full")} disabled={pending} onClick={startEdit}>
              Edit items
            </Button>
          ) : null}
        </>
      )}

      {isDelivery && editable ? (
        <div className="space-y-2 border-t pt-3">
          <label className="text-xs text-muted-foreground" htmlFor="fee">
            Delivery fee (GHS){order.deliveryFeeConfirmed ? "" : " — not confirmed yet"}
          </label>
          <div className="flex gap-2">
            <input
              id="fee"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              className={inputCls}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
            <Button
              type="button"
              className="h-11"
              disabled={pending || fee.trim() === ""}
              onClick={() => run(() => setDeliveryFee(order.id, order.version, Number(fee)), "Delivery fee saved")}
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/* ───────────── payment ───────────── */

function PaymentCard({
  order,
  paymentStatus,
  due,
  claimRef,
  pending,
  run,
}: {
  order: Order;
  paymentStatus: PaymentStatus;
  due: number;
  claimRef: string;
  pending: boolean;
  run: Run;
}) {
  const [method, setMethod] = useState<string>(order.preferredPayment && PAYMENT_METHODS.includes(order.preferredPayment as PaymentMethod) ? order.preferredPayment : "momo");
  const [amount, setAmount] = useState(String(due || ""));
  const [reference, setReference] = useState("");
  const [open, setOpen] = useState(false);
  const [refundRef, setRefundRef] = useState("");

  const claimed = paymentStatus === "pending_verification";

  function prefill() {
    setReference(claimRef);
    setAmount(String(due || ""));
    setOpen(true);
  }

  return (
    <Card title="Payment">
      <dl className="space-y-2">
        <Row label="Status">{PAYMENT_STATUS_LABELS[paymentStatus] ?? order.paymentStatus}</Row>
        <Row label="Amount paid">{formatMoney(order.amountPaid)}</Row>
        {order.paymentMethod ? (
          <Row label="Method">{METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod}</Row>
        ) : null}
        {order.paymentReference ? <Row label="Reference">{order.paymentReference}</Row> : null}
      </dl>

      {claimed ? (
        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
          <p className="text-sm font-medium">Customer says they&apos;ve paid{claimRef ? ` (ref ${claimRef})` : ""}</p>
          <div className="flex gap-2">
            <Button type="button" className={cn(bigBtn, "flex-1")} disabled={pending} onClick={prefill}>
              Mark paid
            </Button>
            <Button
              type="button"
              variant="outline"
              className={bigBtn}
              disabled={pending}
              onClick={() => run(() => rejectPaymentClaim(order.id, order.version, "Payment not received"), "Marked as not received")}
            >
              Not received
            </Button>
          </div>
        </div>
      ) : null}

      {paymentStatus === "refund_due" ? (
        <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
          <p className="text-sm font-medium">Refund due to customer</p>
          <input className={inputCls} placeholder="Refund reference" value={refundRef} onChange={(e) => setRefundRef(e.target.value)} />
          <Button
            type="button"
            className={cn(bigBtn, "w-full")}
            disabled={pending}
            onClick={() => run(() => markRefunded(order.id, order.version, refundRef), "Marked refunded")}
          >
            Mark refunded
          </Button>
        </div>
      ) : null}

      {open || !claimed ? (
        <form
          className="space-y-2 border-t pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => recordPayment({ orderId: order.id, expectedVersion: order.version, method, amount: Number(amount), reference }),
              "Payment recorded",
              (ok) => {
                if (ok) {
                  setReference("");
                  setOpen(false);
                }
              },
            );
          }}
        >
          <p className="text-sm font-medium">Record payment</p>
          <NativeSelect className="h-11 w-full text-base" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => (
              <NativeSelectOption key={m} value={m}>
                {METHOD_LABELS[m]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className={inputCls}
            placeholder="Amount received"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder={method === "cash_on_delivery" ? "Reference (optional)" : "Transaction ID / reference"}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Button type="submit" className={cn(bigBtn, "w-full")} disabled={pending}>
            Record payment
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

/* ───────────── delivery ───────────── */

function DeliveryCard({ order, pending, run }: { order: Order; pending: boolean; run: Run }) {
  // Copy reuses the current link; only "New rider link" replaces it. One toast per click.
  function copyRider() {
    let message = "Rider link copied";
    run(async () => {
      const r = await createRiderLink(order.id, false);
      if (!r.ok) return r;
      if (r.change === "created") message = "Rider link created and copied";
      if (r.change === "renewed") message = "Old rider link had expired — new one copied";
      return (await writeClipboard(r.url)) ? ({ ok: true } as const) : { ok: false as const, error: `Couldn't copy. Link: ${r.url}` };
    }, () => message);
  }
  function newRider() {
    if (!window.confirm("Create a new rider link? Any rider link you've already sent will stop working.")) return;
    run(async () => {
      const r = await createRiderLink(order.id, true);
      if (!r.ok) return r;
      return (await writeClipboard(r.url)) ? ({ ok: true } as const) : { ok: false as const, error: `New link created but couldn't copy. Link: ${r.url}` };
    }, "New rider link created and copied — the old one no longer works");
  }
  return (
    <Card title="Delivery">
      <dl className="space-y-2">
        <Row label="Delivery code">
          <span className="font-mono text-lg font-semibold tracking-widest">{order.deliveryCode ?? "—"}</span>
        </Row>
        <Row label="Failed attempts">{order.riderFailedAttempts}</Row>
        {order.deliveredAt ? (
          <Row label="Delivered">
            {fmtTime(order.deliveredAt)}
            {order.deliveryProof ? ` · ${PROOF_LABELS[order.deliveryProof] ?? order.deliveryProof}` : ""}
          </Row>
        ) : null}
      </dl>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className={cn(bigBtn, "flex-1")} disabled={pending} onClick={copyRider}>
          <Copy /> Copy rider link
        </Button>
        <Button type="button" variant="outline" className={bigBtn} disabled={pending} onClick={newRider}>
          New rider link
        </Button>
      </div>
    </Card>
  );
}

/* ───────────── customer link ───────────── */

/**
 * The order's PDF invoice. On phones "Send PDF on WhatsApp" attaches the actual
 * file through the share sheet; elsewhere it opens a chat with the PDF link.
 */
function InvoiceCard({
  invoiceUrl,
  orderNumber,
  customerName,
  phone,
  confirmed,
}: {
  invoiceUrl: string;
  orderNumber: string;
  customerName: string;
  phone: string | null;
  confirmed: boolean;
}) {
  const [sharing, setSharing] = useState(false);
  const first = customerName.split(/\s+/)[0] ?? customerName;
  const message = `Hi ${first}, here is your ${confirmed ? "invoice" : "pro-forma invoice"} for order ${orderNumber}: ${invoiceUrl}`;
  const waChat = () => {
    const digits = (phone ?? "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  };

  const share = async () => {
    setSharing(true);
    try {
      const res = await fetch(`${invoiceUrl}?download=1`, { cache: "no-store" });
      if (!res.ok) throw new Error("pdf");
      const file = new File([await res.blob()], `Invoice-${orderNumber}.pdf`, { type: "application/pdf" });
      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Invoice ${orderNumber}`, text: message });
      } else {
        waChat();
      }
    } catch (e) {
      // User closed the share sheet → nothing to do. Anything else → link fallback.
      if (!(e instanceof DOMException && e.name === "AbortError")) waChat();
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card title="Invoice">
      <p className="text-sm text-muted-foreground">
        {confirmed
          ? "PDF invoice with your payment details. It updates automatically when the order changes."
          : "Pro-forma until you confirm the order (prices and fee can still change)."}
      </p>
      <Button type="button" className="h-11 w-full bg-[#25D366] text-white hover:bg-[#1ebe5a]" onClick={share} disabled={sharing}>
        <MessageCircle /> {sharing ? "Preparing PDF…" : "Send PDF on WhatsApp"}
      </Button>
      <div className="flex gap-2">
        <Button asChild variant="outline" className="h-11 flex-1">
          <a href={invoiceUrl} target="_blank" rel="noreferrer">
            <ExternalLink /> View
          </a>
        </Button>
        <Button asChild variant="outline" className="h-11 flex-1">
          <a href={`${invoiceUrl}?download=1`} download>
            <Download /> Download
          </a>
        </Button>
      </div>
    </Card>
  );
}

function LinkCard({
  orderId,
  customerLink,
  pending,
  run,
}: {
  orderId: string;
  customerLink: string | null;
  pending: boolean;
  run: Run;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card title="Customer link">
      {customerLink ? (
        <>
          <p className="text-sm break-all text-muted-foreground">{customerLink}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => copyText(customerLink, "Link copied")}>
              <Copy /> Copy
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1">
              <a href={customerLink} target="_blank" rel="noreferrer">
                <ExternalLink /> Open
              </a>
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No customer link for this order.</p>
      )}
      <button type="button" className="h-9 text-sm text-muted-foreground underline underline-offset-2" onClick={() => setConfirmOpen(true)}>
        Reset link
      </button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset customer link?</DialogTitle>
            <DialogDescription>
              The old link will stop working. Send the customer the new one (e.g. with a WhatsApp message).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep link
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => run(() => rotateCustomerLink(orderId), "Link reset", (ok) => ok && setConfirmOpen(false))}
            >
              Reset link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ───────────── timeline ───────────── */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function describeEdit(d: Record<string, unknown>): string {
  const field = str(d.field);
  if (field === "deliveryFee") return `Delivery fee: ${formatMoney(Number(d.before) || 0)} → ${formatMoney(Number(d.after) || 0)}`;
  if (field === "items") {
    const fmt = (v: unknown) =>
      Array.isArray(v) ? v.map((i: { name?: string; quantity?: number }) => `${i.quantity}× ${i.name}`).join(", ") : "";
    return `Items: ${fmt(d.before)} → ${fmt(d.after)}${str(d.note) ? ` (${str(d.note)})` : ""}`;
  }
  return `Edited ${field}`;
}

function eventText(e: EventRow, templateLabels: Record<string, string>, staffNames: Map<string, string>): { text: string; note?: boolean } {
  const d = e.data ?? {};
  const label = (s: string | null) => (s ? STATUS_LABELS[s as OrderStatus] ?? s : "");
  const extra = [str(d.reason) && (CANCEL_REASON_LABELS[str(d.reason) as keyof typeof CANCEL_REASON_LABELS] ?? str(d.reason)), str(d.note)]
    .filter(Boolean)
    .join(" — ");
  switch (e.type) {
    case "status_change":
      return { text: `Status → ${label(e.toStatus)}${extra ? ` (${extra})` : ""}` };
    case "undo":
      return { text: `Undid → ${label(e.toStatus)}${extra ? ` (${extra})` : ""}` };
    case "created":
      return { text: "Order placed on website" };
    case "whatsapp_handoff_click":
      return { text: "Customer tapped Send on WhatsApp" };
    case "payment_claimed":
      return { text: `Customer says paid${str(d.reference) ? ` (ref ${str(d.reference)})` : ""}` };
    case "payment_recorded":
      return {
        text: `Payment recorded: ${formatMoney(Number(d.amount) || 0)} via ${METHOD_LABELS[str(d.method) as PaymentMethod] ?? str(d.method)}${str(d.reference) ? ` (${str(d.reference)})` : ""}`,
      };
    case "payment_claim_rejected":
      return { text: `Payment claim rejected${str(d.note) ? ` (${str(d.note)})` : ""}` };
    case "refunded":
      return { text: `Refunded${str(d.reference) ? ` (ref ${str(d.reference)})` : ""}` };
    case "edited":
      return { text: describeEdit(d) };
    case "assigned":
      return { text: d.to ? `Assigned to ${staffNames.get(str(d.to)) ?? "a staff member"}` : "Unassigned" };
    case "note":
      return { text: str(d.note), note: true };
    case "message_sent":
      return { text: `Sent “${templateLabels[str(d.template)] ?? str(d.template)}” on WhatsApp` };
    case "link_rotated":
      if (str(d.which) === "rider" && str(d.change) === "created") return { text: "Rider link created" };
      if (str(d.which) === "rider" && str(d.change) === "renewed") return { text: "Rider link renewed (old one expired)" };
      return { text: `${str(d.which) === "rider" ? "Rider" : "Customer"} link reset` };
    default:
      return { text: e.type.replace(/_/g, " ") };
  }
}

function TimelineCard({
  orderId,
  events,
  staff,
  templateLabels,
  pending,
  run,
}: {
  orderId: string;
  events: EventRow[];
  staff: { id: string; name: string }[];
  templateLabels: Record<string, string>;
  pending: boolean;
  run: Run;
}) {
  const [note, setNote] = useState("");
  const staffNames = new Map(staff.map((s) => [s.id, s.name]));

  return (
    <Card title="Timeline">
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addOrderNote(orderId, note), "Note added", (ok) => ok && setNote(""));
        }}
      >
        <textarea
          className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder="Add an internal note"
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Internal — not shown to the customer</span>
          <Button type="submit" className="h-11" disabled={pending || !note.trim()}>
            Add note
          </Button>
        </div>
      </form>
      <ol className="space-y-3 border-t pt-3">
        {events.map((e) => {
          const { text, note: isNote } = eventText(e, templateLabels, staffNames);
          const actor = e.actorName ?? (e.actorType === "customer" ? "Customer" : e.actorType === "rider" ? "Rider" : e.actorType === "system" ? "System" : "Staff");
          return (
            <li key={e.id} className="text-sm">
              <p className="text-xs text-muted-foreground">
                {fmtTime(e.createdAt)} · {actor}
              </p>
              {isNote ? (
                <p className="mt-1 rounded-md border border-yellow-300 bg-yellow-50 p-2 whitespace-pre-wrap text-yellow-950 dark:border-yellow-500/40 dark:bg-yellow-500/10 dark:text-yellow-100">
                  {text}
                  <span className="mt-1 block text-xs opacity-70">Internal — not shown to the customer</span>
                </p>
              ) : (
                <p>{text}</p>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
