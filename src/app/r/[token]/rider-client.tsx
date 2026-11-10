"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { OrderStatus } from "@/lib/orders/status";
import { telLink } from "@/lib/settings/schemas";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";

import { riderConfirm, riderFailed, riderStart } from "./actions";

export function RiderPanel(props: {
  token: string;
  status: OrderStatus;
  collect: boolean;
  dueText: string;
  locked: boolean;
  shopPhone: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [cash, setCash] = useState(false);
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState<"start" | "confirm" | "failed">("start");

  const done = props.status === "delivered" || props.status === "completed";
  if (done) {
    return <p className="rounded-xl bg-green-50 p-4 text-center font-semibold text-green-800">Delivered ✓ Thank you!</p>;
  }

  const callShop = props.shopPhone ? (
    <a href={telLink(props.shopPhone)} className="block text-center text-sm underline">
      Problem? Call the shop
    </a>
  ) : null;

  if (props.status !== "out_for_delivery") {
    const startable = ["confirmed", "preparing", "delivery_failed"].includes(props.status);
    return (
      <div className="space-y-3">
        {startable ? (
          <Button
            size="lg"
            className="h-14 w-full text-base"
            disabled={pending}
            loading={pending && active === "start"}
            onClick={() => {
              setActive("start");
              start(async () => {
                const r = await riderStart(props.token);
                if (r.ok) router.refresh();
                else toast.error(r.error);
              });
            }}
          >
            Start delivery
          </Button>
        ) : (
          <p className="rounded-xl bg-muted p-4 text-center">This order isn&apos;t ready for delivery.</p>
        )}
        {callShop}
      </div>
    );
  }

  if (props.locked) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-red-50 p-4 text-center text-red-800">Too many wrong codes. Call the shop to confirm this delivery.</p>
        {callShop}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 rounded-xl border-2 border-primary p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setActive("confirm");
          start(async () => {
            const r = await riderConfirm(props.token, code, cash);
            if (r.ok) {
              toast.success("Delivered!");
              router.refresh();
            } else {
              setError(r.error);
              if (r.locked) router.refresh();
            }
          });
        }}
      >
        <label htmlFor="code" className="block font-semibold">
          Customer&apos;s delivery code
        </label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-14 text-center font-mono text-3xl tracking-[0.4em]"
          aria-invalid={!!error}
        />
        {props.collect ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="h-5 w-5" />
            I collected {props.dueText}
          </label>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-14 w-full text-base" disabled={pending || code.length !== 4}
          loading={pending && active === "confirm"}
        >
          Confirm delivery
        </Button>
      </form>

      {failing ? (
        <form
          className="space-y-2 rounded-xl border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setActive("failed");
            start(async () => {
              const r = await riderFailed(props.token, reason);
              if (r.ok) {
                toast.success("The shop has been told.");
                router.refresh();
              } else toast.error(r.error);
            });
          }}
        >
          <label htmlFor="reason" className="block text-sm font-semibold">
            What happened?
          </label>
          <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer not answering" />
          <Button type="submit" variant="destructive" className="w-full" disabled={pending} loading={pending && active === "failed"}>
            Couldn&apos;t deliver
          </Button>
        </form>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setFailing(true)}>
          I couldn&apos;t deliver
        </Button>
      )}
      {callShop}
    </div>
  );
}
