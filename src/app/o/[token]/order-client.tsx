"use client";

import { Copy, MessageCircle, Phone, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart-context";
import { telLink } from "@/lib/settings/schemas";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";

import { customerCancel, customerPaid, customerReceived, logHandoffClick } from "./actions";

const WA_GREEN = "bg-[#25D366] text-white hover:bg-[#1ebe5a]";

/** Re-render server data every 30s while visible, and when the tab regains focus. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, router]);
  return null;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}
function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|Line\/|TikTok|Snapchat/i.test(navigator.userAgent);
}

export function HandoffPanel(props: {
  token: string;
  autoOpen: boolean;
  sendUrl: string;
  deepUrl: string;
  message: string;
  qrSvg: string;
  businessNumber: string;
  callNumber: string;
  hours: string;
  responseTime: string;
  note: string;
}) {
  const [mobile, setMobile] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);
  const opened = useRef(false);

  const open = () => {
    void logHandoffClick(props.token).catch(() => undefined);
    // In-app browsers often block https://wa.me navigation; the native scheme works there.
    window.location.href = isInAppBrowser() ? props.deepUrl : props.sendUrl;
  };

  useEffect(() => {
    const m = isMobile();
    setMobile(m);
    // Fresh order on a phone: open WhatsApp automatically after a short beat (never on desktop).
    if (props.autoOpen && m && !opened.current) {
      opened.current = true;
      setOpening(true);
      const id = window.setTimeout(() => {
        open();
        setOpening(false);
      }, 1200);
      // Drop ?new=1 so Back / refresh doesn't re-trigger the redirect.
      window.history.replaceState(null, "", window.location.pathname);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.message);
      toast.success("Order message copied. Paste it in WhatsApp.");
    } catch {
      toast.error("Couldn't copy. Select the text below and copy it.");
    }
  };

  return (
    <section className="mt-6 rounded-2xl border-2 border-[#25D366] bg-[#25D366]/5 p-5">
      <h2 className="font-semibold">Last step: send your order on WhatsApp</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your order is saved, but we only see it once you send the message. We'll confirm stock, delivery and payment there.
      </p>
      {opening ? <p className="mt-3 text-sm font-medium">Opening WhatsApp…</p> : null}
      <Button type="button" size="lg" className={`mt-4 h-12 w-full rounded-full text-base ${WA_GREEN}`} onClick={open} data-testid="send-whatsapp">
        <MessageCircle className="mr-2 h-5 w-5" /> Send order on WhatsApp
      </Button>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={copy}>
          <Copy className="mr-1 h-4 w-4" /> Copy message
        </Button>
        {props.callNumber ? (
          <a href={telLink(props.callNumber)} className="inline-flex items-center rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
            <Phone className="mr-1 h-4 w-4" /> Call us instead
          </a>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        WhatsApp number: <span className="font-medium text-foreground">{props.businessNumber}</span>
        {props.hours ? ` · We reply ${props.hours}` : ""}
        {props.responseTime ? ` · ${props.responseTime}` : ""}
      </p>
      {props.note ? <p className="mt-2 text-xs text-muted-foreground">{props.note}</p> : null}
      {mobile === false ? (
        <div className="mt-4 flex items-center gap-4 rounded-xl bg-background p-3">
          <div
            className="h-[120px] w-[120px] shrink-0 [&>svg]:h-full [&>svg]:w-full"
            aria-label="QR code to open the order message on your phone"
            role="img"
            dangerouslySetInnerHTML={{ __html: props.qrSvg }}
          />
          <p className="text-sm text-muted-foreground">
            On a computer? Scan this with your phone camera to send the order from WhatsApp on your phone.
          </p>
        </div>
      ) : null}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">See the message</summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-3 font-sans text-xs" data-testid="handoff-message">
          {props.message}
        </pre>
      </details>
    </section>
  );
}

export function PaidForm({ token }: { token: string }) {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="mt-4 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await customerPaid(token, ref);
          if (res.ok) {
            toast.success("Thanks! We'll confirm once we see the payment.");
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <Input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="Transaction ID (optional)"
        aria-label="Payment transaction ID"
        maxLength={120}
      />
      <Button type="submit" disabled={pending} className="shrink-0">
        {pending ? "Sending…" : "I've paid"}
      </Button>
    </form>
  );
}

export function CustomerActions(props: {
  token: string;
  canCancel: boolean;
  canConfirmReceived: boolean;
  receivedLabel: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!props.canCancel && !props.canConfirmReceived) return null;
  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else toast.error(res.error);
    });
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      {props.canConfirmReceived ? (
        <Button
          type="button"
          className="flex-1 rounded-full"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Confirm you have your order?")) run(() => customerReceived(props.token), "Thanks! Enjoy your tea.");
          }}
        >
          {props.receivedLabel}
        </Button>
      ) : null}
      {props.canCancel ? (
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-full text-destructive"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Cancel this order?")) run(() => customerCancel(props.token), "Order cancelled.");
          }}
        >
          Cancel order
        </Button>
      ) : null}
    </div>
  );
}

export function RestoreCart({
  items,
}: {
  items: { id: string; name: string; price: number; image?: string; quantity: number }[];
}) {
  const router = useRouter();
  const { addToCart, updateQuantity, items: cart } = useCart();
  const restorable = items.filter((i) => i.id);
  if (restorable.length === 0) return null;
  return (
    <Button
      type="button"
      size="lg"
      className="mt-6 w-full rounded-full"
      onClick={() => {
        for (const i of restorable) {
          const existing = cart.find((c) => c.id === i.id)?.quantity ?? 0;
          if (existing === 0) addToCart({ id: i.id, name: i.name, price: i.price, image: i.image });
          updateQuantity(i.id, existing + i.quantity);
        }
        // Prices are re-checked when the new order is placed.
        router.push("/cart");
      }}
    >
      <RotateCcw className="mr-2 h-4 w-4" /> Put these items back in my cart
    </Button>
  );
}
