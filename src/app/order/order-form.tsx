"use client";

import { AlertTriangle, ChevronDown, Loader2, MessageCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart-context";
import { DELIVERY_CHARGES_NOTE } from "@/lib/orders/delivery-copy";
import { formatMoney } from "@/lib/orders/money";
import { normalizePhone } from "@/lib/orders/phone";
import type { ItemProblem, PriceChange } from "@/lib/orders/place-order-schema";
import { Alert, AlertDescription, AlertTitle } from "@/ui/primitives/alert";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/primitives/collapsible";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";

import { placeOrder } from "./actions";

export type OrderFormConfig = {
  ordering: {
    acceptingOrders: boolean;
    pausedMessage: string;
    maxQtyPerItem: number;
    maxOrderTotal: number;
    largeOrderMessage: string;
  };
  contact: { whatsappNumber: string; orderPhone: string };
  prefill: { name: string; phone: string } | null;
};

const LAST_ORDER_CART_KEY = "wb-last-order-cart";
/** Returning customers skip typing: name + number are remembered on this device. */
const CUSTOMER_KEY = "wb-customer";
const FIELD_KEYS = new Set(["name", "phone"]);

/**
 * Quick checkout: name + WhatsApp number, then straight to WhatsApp. Delivery
 * location, fee and payment are all agreed in the chat.
 */
export function OrderForm({ config }: { config: OrderFormConfig }) {
  const { ordering, contact, prefill } = config;
  const router = useRouter();
  const { items, totalPrice, clearCart, isHydrated } = useCart();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // One key per page load: retries of the same submit resolve to the same order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [website, setWebsite] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scrollTick, setScrollTick] = useState(0);
  const [priceChanges, setPriceChanges] = useState<PriceChange[] | null>(null);
  const [problems, setProblems] = useState<ItemProblem[] | null>(null);
  const [duplicate, setDuplicate] = useState<{ error: string; token: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [acceptPrices, setAcceptPrices] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [activeAction, setActiveAction] = useState<"submit" | "prices" | "duplicate">("submit");

  // Fill blanks from the last order on this device.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? "null") as { name?: string; phone?: string } | null;
      if (saved?.name) setName((cur) => cur || saved.name || "");
      if (saved?.phone) setPhone((cur) => cur || saved.phone || "");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const waDigits = (contact.whatsappNumber || contact.orderPhone).replace(/\D/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : null;
  const WhatsAppLink = () =>
    waHref ? (
      <Button asChild className="bg-[#25D366] text-white hover:bg-[#1ebe5a]">
        <a href={waHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" />
          Chat with us on WhatsApp
        </a>
      </Button>
    ) : null;

  // Scroll/focus the first invalid field after errors are set.
  useEffect(() => {
    if (scrollTick === 0) return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }, [scrollTick]);

  const tooLarge = ordering.maxOrderTotal > 0 && totalPrice > ordering.maxOrderTotal;

  // ── Gates ──────────────────────────────────────────────────────────────
  if (!isHydrated || redirecting) {
    return (
      <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {redirecting ? "Opening WhatsApp…" : "Loading your cart…"}
      </div>
    );
  }

  if (!ordering.acceptingOrders) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <Alert>
          <AlertTriangle />
          <AlertTitle>We&apos;re not taking orders on the website right now</AlertTitle>
          <AlertDescription>
            <p>{ordering.pausedMessage}</p>
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <WhatsAppLink />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
        <ShoppingBag className="mx-auto mb-6 h-20 w-20 text-muted-foreground/50" />
        <h1 className="mb-3 font-serif text-3xl font-bold text-heading">Your cart is empty</h1>
        <p className="mb-8 text-muted-foreground">Add a few teas to your cart, then come back to place your order.</p>
        <Button size="lg" asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  // ── Handlers ───────────────────────────────────────────────────────────
  const clearErr = (key: string) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _drop, ...rest } = e;
      return rest;
    });

  const submit = (opts: { acceptPriceChanges?: boolean; allowDuplicate?: boolean } = {}) => {
    const accept = opts.acceptPriceChanges ?? acceptPrices;
    if (opts.acceptPriceChanges) setAcceptPrices(true);
    setActiveAction(opts.acceptPriceChanges ? "prices" : opts.allowDuplicate ? "duplicate" : "submit");
    setPriceChanges(null);
    setProblems(null);
    setDuplicate(null);
    setFailure(null);

    // Instant client check so a typo doesn't cost a round trip.
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = "Enter your name";
    if (!normalizePhone(phone)) local.phone = "Enter your WhatsApp number, e.g. 054 123 4567";
    setErrors(local);
    if (Object.keys(local).length > 0) {
      setScrollTick((t) => t + 1);
      return;
    }

    startTransition(async () => {
      try {
        const res = await placeOrder({
          idempotencyKey,
          items: items.map((i) => ({ productId: String(i.id), quantity: i.quantity, seenPrice: i.price })),
          name,
          phone,
          acceptPriceChanges: accept,
          allowDuplicate: opts.allowDuplicate ?? false,
          website,
        });

        if (res.ok) {
          try {
            sessionStorage.setItem(LAST_ORDER_CART_KEY, JSON.stringify(items));
            localStorage.setItem(CUSTOMER_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() }));
          } catch {
            /* storage unavailable: order page still works without it */
          }
          setRedirecting(true);
          clearCart();
          router.push(`/o/${res.token}?new=1`);
          return;
        }

        switch (res.code) {
          case "validation":
            setErrors(res.fieldErrors);
            setScrollTick((t) => t + 1);
            toast.error(res.error);
            break;
          case "price_changed":
            setPriceChanges(res.changes);
            break;
          case "items":
            setProblems(res.problems);
            break;
          case "duplicate":
            setDuplicate({ error: res.error, token: res.existingToken });
            break;
          default:
            setFailure(res.error);
        }
      } catch {
        setFailure("Something went wrong. Please try again or message us on WhatsApp.");
      }
    });
  };

  const topErrors = Object.entries(errors).filter(([k]) => !FIELD_KEYS.has(k));
  const err = (k: string) => errors[k];
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <div className="container mx-auto max-w-lg px-4 py-8 md:py-12">
      <Link href="/cart" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to cart
      </Link>
      <h1 className="mb-2 font-serif text-3xl font-bold text-heading md:text-4xl">Almost done</h1>
      <p className="mb-6 text-muted-foreground">
        Tell us who you are and we&apos;ll open WhatsApp with your order ready to send.
      </p>

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        {topErrors.length > 0 ? (
          <Alert variant="destructive" role="alert">
            <AlertTriangle />
            <AlertTitle>Please fix this</AlertTitle>
            <AlertDescription>
              {topErrors.map(([k, m]) => (
                <p key={k}>{m}</p>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        {tooLarge ? (
          <Alert role="alert">
            <AlertTriangle />
            <AlertTitle>This is a large order</AlertTitle>
            <AlertDescription>
              <p>{ordering.largeOrderMessage}</p>
              <div className="mt-3">
                <WhatsAppLink />
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {priceChanges ? (
          <Card className="border-amber-500">
            <CardHeader>
              <CardTitle>Some prices have changed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1 text-sm">
                {priceChanges.map((c) => {
                  const line = items.find((i) => String(i.id) === c.productId);
                  return (
                    <li key={c.productId}>
                      {line?.name ?? c.name}: was {formatMoney(c.was)}, now {formatMoney(c.now)}
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  disabled={pending}
                  loading={pending && activeAction === "prices"}
                  onClick={() => submit({ acceptPriceChanges: true })}
                >
                  Update prices and continue
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/cart">Back to cart</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {problems ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Some items need attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1 text-sm">
                {problems.map((p) => (
                  <li key={p.productId}>
                    <span className="font-medium">{p.name}</span>:{" "}
                    {p.problem === "unavailable"
                      ? "no longer available"
                      : p.problem === "out_of_stock"
                        ? `only ${p.available ?? 0} left`
                        : `max ${p.available ?? ordering.maxQtyPerItem} per order`}
                  </li>
                ))}
              </ul>
              <Button type="button" asChild>
                <Link href="/cart">Fix my cart</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {duplicate ? (
          <Card className="border-amber-500">
            <CardHeader>
              <CardTitle>Looks like a repeat order</CardTitle>
              <CardDescription>{duplicate.error}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" asChild>
                <Link href={`/o/${duplicate.token}`}>View that order</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                loading={pending && activeAction === "duplicate"}
                onClick={() => submit({ allowDuplicate: true })}
              >
                Place a new order anyway
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {failure ? (
          <Alert variant="destructive" role="alert">
            <AlertTriangle />
            <AlertTitle>We couldn&apos;t place your order</AlertTitle>
            <AlertDescription>
              <p>{failure}</p>
              <div className="mt-3">
                <WhatsAppLink />
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearErr("name");
                }}
                placeholder="e.g. Kwame Mensah"
                aria-invalid={err("name") ? true : undefined}
                aria-describedby={err("name") ? "name-error" : undefined}
              />
              {err("name") ? (
                <p id="name-error" role="alert" className="text-sm text-destructive">
                  {err("name")}
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">WhatsApp number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearErr("phone");
                }}
                placeholder="e.g. 054 123 4567"
                aria-invalid={err("phone") ? true : undefined}
                aria-describedby={err("phone") ? "phone-error" : undefined}
              />
              {err("phone") ? (
                <p id="phone-error" role="alert" className="text-sm text-destructive">
                  {err("phone")}
                </p>
              ) : null}
            </div>

            {/* Honeypot: invisible to people, tempting to bots. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={pending || tooLarge}
              loading={pending && activeAction === "submit"}
              className="h-12 w-full bg-[#25D366] text-base text-white hover:bg-[#1ebe5a] disabled:opacity-60"
            >
              {pending && activeAction === "submit" ? (
                "Opening WhatsApp…"
              ) : (
                <>
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Send order on WhatsApp
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No account or card needed. Delivery location and payment are sorted out in the chat.
            </p>
          </CardContent>
        </Card>

        {/* Summary: collapsed by default so it doesn't stand between the customer and the button. */}
        <Card>
          <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between gap-3 text-left">
                  <CardTitle className="text-base">
                    {itemCount} {itemCount === 1 ? "item" : "items"} · {formatMoney(totalPrice)}
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
              <CardDescription>{DELIVERY_CHARGES_NOTE}</CardDescription>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="text-sm">
                      <div className="flex justify-between gap-3">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="shrink-0 font-medium">{formatMoney(item.price * item.quantity)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
            {items.some((i) => i.quantity > ordering.maxQtyPerItem) ? (
              <CardContent>
                <p className="text-xs text-destructive">
                  Some items are over the {ordering.maxQtyPerItem} per order limit.{" "}
                  <Link href="/cart" className="underline">
                    Change in cart
                  </Link>
                </p>
              </CardContent>
            ) : null}
          </Collapsible>
        </Card>
      </form>
    </div>
  );
}
