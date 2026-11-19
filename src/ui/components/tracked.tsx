"use client";

import { useEffect } from "react";

import type { SiteEventName } from "@/lib/tracking/events";
import { track, type TrackParams } from "@/lib/tracking/client";

/** Fires one event when mounted (e.g. view_item on a product page). */
export function TrackOnMount({ event, params }: { event: SiteEventName; params?: TrackParams }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    track(event, JSON.parse(key) as TrackParams);
  }, [event, key]);
  return null;
}

/** A plain <a> that records an event when clicked (WhatsApp buttons, CTAs). */
export function TrackedAnchor({
  event,
  params,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: SiteEventName; params?: TrackParams }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event, params);
        onClick?.(e);
      }}
    />
  );
}
