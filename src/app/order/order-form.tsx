"use client";

import { AlertTriangle, ChevronDown, Loader2, MapPin, MessageCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useCart } from "@/lib/cart-context";
import { formatMoney } from "@/lib/orders/money";
import { normalizePhone } from "@/lib/orders/phone";
import type { ItemProblem, PriceChange } from "@/lib/orders/place-order-schema";
import type { PaymentMethod } from "@/lib/orders/status";
import { Alert, AlertDescription, AlertTitle } from "@/ui/primitives/alert";
import { Button } from "@/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Checkbox } from "@/ui/primitives/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/primitives/collapsible";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { NativeSelect, NativeSelectOption } from "@/ui/primitives/native-select";
import { RadioGroup, RadioGroupItem } from "@/ui/primitives/radio-group";
import { Switch } from "@/ui/primitives/switch";
import { Textarea } from "@/ui/primitives/textarea";

import { placeOrder } from "./actions";

export type OrderFormConfig = {
  ordering: {
    acceptingOrders: boolean;
    pausedMessage: string;
    maxQtyPerItem: number;
    maxOrderTotal: number;
    largeOrderMessage: string;
    momoEnabled: boolean;
    bankEnabled: boolean;
    codEnabled: boolean;
    paymentNote: string;
    consentText: string;
    deliveryWindows: { id: string; label: string }[];
  };
  delivery: {
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    zones: { id: string; name: string; areas: string; fee: number | null; etaText: string }[];
    allowUnlistedAreas: boolean;
    freeDeliveryOver: number | null;
    deliveryNote: string;
  };
  pickupLocations: { id: string; name: string; address: string; hours: string; mapUrl: string }[];
  contact: { whatsappNumber: string; orderPhone: string; businessHours: string; responseTime: string };
  prefill: { name: string; phone: string; email: string; address: string } | null;
};

const OTHER_AREA = "__other";
const LAST_ORDER_CART_KEY = "wb-last-order-cart";
const FIELD_KEYS = new Set([
  "name",
  "phone",
  "email",
  "zoneId",
  "areaText",
  "address",
  "gpsAddress",
  "deliveryWindow",
  "recipientName",
  "recipientPhone",
  "giftMessage",
  "pickupLocationId",
  "preferredPayment",
  "note",
  "consent",
]);

const radioCard =
  "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function OrderForm({ config }: { config: OrderFormConfig }) {
  const { ordering, delivery, pickupLocations, contact, prefill } = config;
  const router = useRouter();
  const { items, totalPrice, clearCart, isHydrated } = useCart();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // One key per page load: retries of the same submit resolve to the same order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const deliveryOn = delivery.deliveryEnabled;
  const pickupOn = delivery.pickupEnabled && pickupLocations.length > 0;
  const paymentOptions = (
    [
      ["momo", ordering.momoEnabled],
      ["bank", ordering.bankEnabled],
      ["cash_on_delivery", ordering.codEnabled],
    ] as [PaymentMethod, boolean][]
  )
    .filter(([, on]) => on)
    .map(([m]) => m);

  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">(deliveryOn ? "delivery" : "pickup");
  const [zoneId, setZoneId] = useState("");
  const [areaText, setAreaText] = useState("");
  const [address, setAddress] = useState(prefill?.address ?? "");
  const [gpsAddress, setGpsAddress] = useState("");
  const [deliveryWindow, setDeliveryWindow] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [pickupLocationId, setPickupLocationId] = useState(pickupLocations.length === 1 ? pickupLocations[0].id : "");
  const [payment, setPayment] = useState<PaymentMethod | "">(paymentOptions[0] ?? "");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
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

  const waDigits = (contact.whatsappNumber || contact.orderPhone).replace(/\D/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}` : null;
  const WhatsAppLink = ({ className }: { className?: string }) =>
    waHref ? (
      <Button asChild className={className ?? "bg-[#25D366] text-white hover:bg-[#1ebe5a]"}>
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
    } else {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [scrollTick]);

  // ── Fees ───────────────────────────────────────────────────────────────
  const zone = delivery.zones.find((z) => z.id === zoneId);
  const freeOver = delivery.freeDeliveryOver !== null && totalPrice >= delivery.freeDeliveryOver;
  let feeLabel: string;
  let knownFee = 0;
  if (fulfilment === "pickup") {
    feeLabel = "Free";
  } else if (freeOver) {
    feeLabel = "Free";
  } else if (zone && zone.fee !== null) {
    knownFee = zone.fee;
    feeLabel = zone.fee === 0 ? "Free" : formatMoney(zone.fee);
  } else {
    feeLabel = "Confirmed on WhatsApp";
  }
  const feePending = feeLabel === "Confirmed on WhatsApp";
  const total = totalPrice + knownFee;
  const tooLarge = ordering.maxOrderTotal > 0 && totalPrice > ordering.maxOrderTotal;
  const canSubmit = !pending && !tooLarge && paymentOptions.length > 0 && (deliveryOn || pickupOn);

  // ── Gates ──────────────────────────────────────────────────────────────
  if (!isHydrated || redirecting) {
    return (
      <div className="container mx-auto flex items-center justify-center gap-2 px-4 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {redirecting ? "Opening your order…" : "Loading your cart…"}
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

  const checkPhone = (key: "phone" | "recipientPhone", value: string) => {
    if (value.trim() && !normalizePhone(value)) {
      setErrors((e) => ({ ...e, [key]: "Enter a valid phone number, e.g. 054 123 4567" }));
    } else {
      clearErr(key);
    }
  };

  const submit = (opts: { acceptPriceChanges?: boolean; allowDuplicate?: boolean } = {}) => {
    const accept = opts.acceptPriceChanges ?? acceptPrices;
    if (opts.acceptPriceChanges) setAcceptPrices(true);
    setErrors({});
    setPriceChanges(null);
    setProblems(null);
    setDuplicate(null);
    setFailure(null);

    const otherArea = zoneId === OTHER_AREA;
    startTransition(async () => {
      try {
        const res = await placeOrder({
          idempotencyKey,
          items: items.map((i) => ({ productId: String(i.id), quantity: i.quantity, seenPrice: i.price })),
          name,
          phone,
          email,
          fulfilment,
          zoneId: fulfilment === "delivery" && !otherArea ? zoneId : "",
          areaText: fulfilment === "delivery" && otherArea ? areaText : "",
          address: fulfilment === "delivery" ? address : "",
          gpsAddress: fulfilment === "delivery" ? gpsAddress : "",
          pickupLocationId: fulfilment === "pickup" ? pickupLocationId : "",
          deliveryWindow: fulfilment === "delivery" ? deliveryWindow : "",
          preferredPayment: (payment || "momo") as PaymentMethod,
          note,
          isGift: fulfilment === "delivery" && isGift,
          recipientName: fulfilment === "delivery" && isGift ? recipientName : "",
          recipientPhone: fulfilment === "delivery" && isGift ? recipientPhone : "",
          giftMessage: fulfilment === "delivery" && isGift ? giftMessage : "",
          consent: consent as true,
          acceptPriceChanges: accept,
          allowDuplicate: opts.allowDuplicate ?? false,
          website,
        });

        if (res.ok) {
          try {
            sessionStorage.setItem(LAST_ORDER_CART_KEY, JSON.stringify(items));
          } catch {
            /* storage unavailable: order page still works without the snapshot */
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
  const aria = (k: string, hint?: boolean) => ({
    "aria-invalid": err(k) ? true : undefined,
    "aria-describedby": err(k) ? `${k}-error` : hint ? `${k}-hint` : undefined,
  });

  const payLabels: Record<PaymentMethod, { title: string; desc: string }> = {
    momo: { title: "Mobile Money", desc: "MTN, Telecel or AirtelTigo" },
    bank: { title: "Bank transfer", desc: "We'll send our account details" },
    cash_on_delivery: {
      title: fulfilment === "pickup" ? "Pay on pickup" : "Pay on delivery",
      desc: fulfilment === "pickup" ? "Pay when you collect your order" : "Pay the rider when it arrives",
    },
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Link href="/cart" className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to cart
      </Link>
      <h1 className="mb-2 font-serif text-3xl font-bold text-heading md:text-4xl">Your details</h1>
      <p className="mb-6 text-muted-foreground">
        No account or card needed. We confirm your order and payment on WhatsApp.
      </p>

      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-6"
      >
        {/* Problems from the server */}
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
                <Button type="button" disabled={pending} onClick={() => submit({ acceptPriceChanges: true })}>
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
              <Button type="button" variant="outline" disabled={pending} onClick={() => submit({ allowDuplicate: true })}>
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

        {/* 1. Summary */}
        <Card>
          <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between text-left">
                  <CardTitle>
                    Order summary ({items.reduce((n, i) => n + i.quantity, 0)}{" "}
                    {items.reduce((n, i) => n + i.quantity, 0) === 1 ? "item" : "items"})
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CardContent className="space-y-4">
              <CollapsibleContent>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="text-sm">
                      <div className="flex justify-between gap-3">
                        <span>
                          {item.name} × {item.quantity}
                        </span>
                        <span className="shrink-0 font-medium">{formatMoney(item.price * item.quantity)}</span>
                      </div>
                      {item.quantity > ordering.maxQtyPerItem ? (
                        <p className="mt-1 text-xs text-destructive">
                          Max {ordering.maxQtyPerItem} per order.{" "}
                          <Link href="/cart" className="underline">
                            Change in cart
                          </Link>
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
              {/* Quantity warnings stay visible even when the list is collapsed */}
              {!summaryOpen && items.some((i) => i.quantity > ordering.maxQtyPerItem) ? (
                <p className="text-xs text-destructive">
                  Some items are over the {ordering.maxQtyPerItem} per order limit.{" "}
                  <Link href="/cart" className="underline">
                    Change in cart
                  </Link>
                </p>
              ) : null}
              <div className="space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{fulfilment === "pickup" ? "Pickup" : "Delivery"}</span>
                  <span>{feeLabel}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-lg font-bold">
                  <span>Total</span>
                  <span>
                    {formatMoney(total)}
                    {feePending ? <span className="text-sm font-normal text-muted-foreground"> + delivery</span> : null}
                  </span>
                </div>
              </div>
            </CardContent>
          </Collapsible>
        </Card>

        {/* 2. Details */}
        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field id="name" label="Full name" error={err("name")}>
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
                {...aria("name")}
              />
            </Field>
            <Field
              id="phone"
              label="WhatsApp number"
              hint="We'll confirm your order on this number"
              error={err("phone")}
            >
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
                onBlur={(e) => checkPhone("phone", e.target.value)}
                placeholder="e.g. 054 123 4567"
                {...aria("phone", true)}
              />
            </Field>
            <Field id="email" label="Email (optional)" error={err("email")}>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearErr("email");
                }}
                {...aria("email")}
              />
            </Field>
          </CardContent>
        </Card>

        {/* 3. Delivery / pickup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {deliveryOn && pickupOn ? "Delivery or pickup" : pickupOn ? "Pickup" : "Delivery"}
            </CardTitle>
            {delivery.deliveryNote && fulfilment === "delivery" ? (
              <CardDescription>{delivery.deliveryNote}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {!deliveryOn && !pickupOn ? (
              <Alert variant="destructive" role="alert">
                <AlertTriangle />
                <AlertDescription>
                  <p>Delivery and pickup aren&apos;t available online right now. Please message us on WhatsApp.</p>
                </AlertDescription>
              </Alert>
            ) : null}

            {deliveryOn && pickupOn ? (
              <div role="group" aria-label="Delivery or pickup" className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
                {(["delivery", "pickup"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={fulfilment === f}
                    onClick={() => {
                      setFulfilment(f);
                      clearErr("fulfilment");
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      fulfilment === f ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "delivery" ? "Delivery" : "Pickup"}
                  </button>
                ))}
              </div>
            ) : null}

            {fulfilment === "delivery" && deliveryOn ? (
              <>
                <Field id="zoneId" label="Your area" error={err("zoneId")}>
                  <div className="[&>div]:w-full">
                    <NativeSelect
                      id="zoneId"
                      value={zoneId}
                      onChange={(e) => {
                        setZoneId(e.target.value);
                        clearErr("zoneId");
                      }}
                      {...aria("zoneId")}
                    >
                      <NativeSelectOption value="">Choose your area</NativeSelectOption>
                      {delivery.zones.map((z) => (
                        <NativeSelectOption key={z.id} value={z.id}>
                          {z.name} —{" "}
                          {z.fee === null ? "fee confirmed on WhatsApp" : z.fee === 0 ? "Free" : formatMoney(z.fee)}
                          {z.etaText ? ` (${z.etaText})` : ""}
                        </NativeSelectOption>
                      ))}
                      {delivery.allowUnlistedAreas ? (
                        <NativeSelectOption value={OTHER_AREA}>My area isn&apos;t listed</NativeSelectOption>
                      ) : null}
                    </NativeSelect>
                  </div>
                </Field>
                {zone?.areas ? <p className="-mt-2 text-xs text-muted-foreground">Includes: {zone.areas}</p> : null}
                {delivery.freeDeliveryOver !== null ? (
                  <p className="-mt-2 text-xs text-muted-foreground">
                    Free delivery on orders of {formatMoney(delivery.freeDeliveryOver)} or more.
                  </p>
                ) : null}
                {zoneId === OTHER_AREA ? (
                  <Field
                    id="areaText"
                    label="Your area"
                    hint="We'll confirm the delivery fee on WhatsApp"
                    error={err("areaText")}
                  >
                    <Input
                      id="areaText"
                      value={areaText}
                      onChange={(e) => {
                        setAreaText(e.target.value);
                        clearErr("areaText");
                        clearErr("zoneId");
                      }}
                      placeholder="Town or neighbourhood"
                      {...aria("areaText", true)}
                    />
                  </Field>
                ) : null}

                <Field
                  id="address"
                  label="Address or landmark"
                  hint="House number, street, or a landmark the rider can find"
                  error={err("address")}
                >
                  <Textarea
                    id="address"
                    rows={3}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      clearErr("address");
                    }}
                    {...aria("address", true)}
                  />
                </Field>
                <Field id="gpsAddress" label="GhanaPost GPS (optional)" error={err("gpsAddress")}>
                  <Input
                    id="gpsAddress"
                    value={gpsAddress}
                    onChange={(e) => setGpsAddress(e.target.value)}
                    placeholder="GA-123-4567"
                    autoCapitalize="characters"
                    {...aria("gpsAddress")}
                  />
                </Field>
                {ordering.deliveryWindows.length > 0 ? (
                  <Field id="deliveryWindow" label="Preferred delivery time" error={err("deliveryWindow")}>
                    <div className="[&>div]:w-full">
                      <NativeSelect
                        id="deliveryWindow"
                        value={deliveryWindow}
                        onChange={(e) => setDeliveryWindow(e.target.value)}
                        {...aria("deliveryWindow")}
                      >
                        <NativeSelectOption value="">Any time</NativeSelectOption>
                        {ordering.deliveryWindows.map((w) => (
                          <NativeSelectOption key={w.id} value={w.id}>
                            {w.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  </Field>
                ) : null}

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="isGift">This is a gift</Label>
                  <Switch id="isGift" checked={isGift} onCheckedChange={setIsGift} />
                </div>
                {isGift ? (
                  <div className="space-y-4 rounded-lg border border-dashed border-border p-4">
                    <Field id="recipientName" label="Recipient's name" error={err("recipientName")}>
                      <Input
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                          clearErr("recipientName");
                        }}
                        {...aria("recipientName")}
                      />
                    </Field>
                    <Field id="recipientPhone" label="Recipient's phone" error={err("recipientPhone")}>
                      <Input
                        id="recipientPhone"
                        type="tel"
                        inputMode="tel"
                        value={recipientPhone}
                        onChange={(e) => {
                          setRecipientPhone(e.target.value);
                          clearErr("recipientPhone");
                        }}
                        onBlur={(e) => checkPhone("recipientPhone", e.target.value)}
                        {...aria("recipientPhone")}
                      />
                    </Field>
                    <Field id="giftMessage" label="Gift message (optional)" error={err("giftMessage")}>
                      <Textarea
                        id="giftMessage"
                        rows={2}
                        maxLength={300}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        {...aria("giftMessage")}
                      />
                    </Field>
                  </div>
                ) : null}
              </>
            ) : null}

            {fulfilment === "pickup" && pickupOn ? (
              <div className="space-y-1.5">
                <RadioGroup
                  value={pickupLocationId}
                  onValueChange={(v) => {
                    setPickupLocationId(v);
                    clearErr("pickupLocationId");
                  }}
                  aria-label="Pickup point"
                  {...aria("pickupLocationId")}
                >
                  {pickupLocations.map((l) => (
                    <div key={l.id} className="rounded-lg border border-border has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <label htmlFor={`pickup-${l.id}`} className="flex cursor-pointer items-start gap-3 p-4">
                        <RadioGroupItem value={l.id} id={`pickup-${l.id}`} className="mt-1" />
                        <div className="text-sm">
                          <p className="font-medium">{l.name}</p>
                          {l.address ? <p className="text-muted-foreground">{l.address}</p> : null}
                          {l.hours ? <p className="text-muted-foreground">{l.hours}</p> : null}
                        </div>
                      </label>
                      {l.mapUrl ? (
                        <a
                          href={l.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mb-3 ml-11 inline-block text-sm text-primary underline"
                        >
                          View on map
                        </a>
                      ) : null}
                    </div>
                  ))}
                </RadioGroup>
                {err("pickupLocationId") ? (
                  <p id="pickupLocationId-error" role="alert" className="text-sm text-destructive">
                    {err("pickupLocationId")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* 4. Payment */}
        <Card>
          <CardHeader>
            <CardTitle>How you&apos;d like to pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Online ordering has no payment options set up. Please message us on WhatsApp.
              </p>
            ) : (
              <RadioGroup
                value={payment}
                onValueChange={(v) => {
                  setPayment(v as PaymentMethod);
                  clearErr("preferredPayment");
                }}
                aria-label="Payment method"
                {...aria("preferredPayment")}
              >
                {paymentOptions.map((m) => (
                  <label key={m} htmlFor={`pay-${m}`} className={radioCard}>
                    <RadioGroupItem value={m} id={`pay-${m}`} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium">{payLabels[m].title}</p>
                      <p className="text-muted-foreground">{payLabels[m].desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            )}
            {err("preferredPayment") ? (
              <p id="preferredPayment-error" role="alert" className="text-sm text-destructive">
                {err("preferredPayment")}
              </p>
            ) : null}
            {ordering.paymentNote ? <p className="text-sm text-muted-foreground">{ordering.paymentNote}</p> : null}
          </CardContent>
        </Card>

        {/* 5. Note */}
        <Card>
          <CardHeader>
            <CardTitle>Note to us</CardTitle>
          </CardHeader>
          <CardContent>
            <Field id="note" label="Anything we should know? (optional)" error={err("note")}>
              <Textarea
                id="note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                {...aria("note")}
              />
            </Field>
          </CardContent>
        </Card>

        {/* 6. Consent + submit */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => {
                setConsent(v === true);
                clearErr("consent");
              }}
              className="mt-0.5"
              {...aria("consent")}
            />
            <Label htmlFor="consent" className="text-sm font-normal leading-snug">
              {ordering.consentText}
            </Label>
          </div>
          {err("consent") ? (
            <p id="consent-error" role="alert" className="text-sm text-destructive">
              {err("consent")}
            </p>
          ) : null}

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
            disabled={!canSubmit}
            className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5a] disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing your order…
              </>
            ) : (
              <>
                <MessageCircle className="mr-2 h-4 w-4" />
                Continue to WhatsApp
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Next, WhatsApp opens with your order ready to send.
          </p>
        </div>
      </form>
    </div>
  );
}
