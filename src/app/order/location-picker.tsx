"use client";

import { Crosshair, MapPin, X } from "lucide-react";
import { useRef, useState } from "react";

import { accuracyLabel, mapsUrl } from "@/lib/orders/location";
import { Button } from "@/ui/primitives/button";

export type PickedLocation = { lat: number; lng: number; accuracy: number };
export type ReverseGeocode = { address: string; area: string };

type State =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "error"; message: string };

// Rough Ghana bounding box — a pin outside it is almost certainly wrong (VPN, desktop IP lookup).
const inGhana = (lat: number, lng: number) => lat >= 4.5 && lat <= 11.3 && lng >= -3.4 && lng <= 1.3;

function getPosition(highAccuracy: boolean): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 15_000 : 20_000,
      maximumAge: 60_000,
    }),
  );
}

/**
 * Best-effort readable address for a pin. Never blocks the order: the pin
 * itself is saved either way. OpenStreetMap first, BigDataCloud as fallback
 * (Nominatim rate-limits/blocks some networks).
 */
async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode | null> {
  // Run both at once; prefer the more detailed OpenStreetMap answer.
  const fallback = bigDataCloud(lat, lng);
  return (await nominatim(lat, lng)) ?? (await fallback);
}

async function bigDataCloud(lat: number, lng: number): Promise<ReverseGeocode | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      { signal: ctrl.signal },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { locality?: string; city?: string; principalSubdivision?: string };
    const area = j.locality || j.city || "";
    const parts = [j.locality, j.city !== j.locality ? j.city : "", j.principalSubdivision].filter(Boolean) as string[];
    return parts.length ? { address: [...new Set(parts)].join(", "), area } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function nominatim(lat: number, lng: number): Promise<ReverseGeocode | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`,
      { signal: ctrl.signal, headers: { "Accept-Language": "en" } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { address?: Record<string, string> };
    const a = json.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || a.city || "";
    const city = a.city || a.town || a.municipality || "";
    const parts = [a.amenity || a.building || a.shop, street, area, city !== area ? city : ""].filter(Boolean);
    return parts.length ? { address: [...new Set(parts)].join(", "), area } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function LocationPicker({
  value,
  onChange,
  onResolved,
}: {
  value: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
  /** Called with a readable address once the pin is looked up (may never fire). */
  onResolved: (geo: ReverseGeocode) => void;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const requestId = useRef(0);

  const locate = async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState({ kind: "error", message: "Your browser can't share location. Please type your address instead." });
      return;
    }
    if (!window.isSecureContext) {
      setState({ kind: "error", message: "Location only works on the secure (https) site. Please type your address." });
      return;
    }
    const id = ++requestId.current;
    setState({ kind: "locating" });
    let pos: GeolocationPosition;
    try {
      pos = await getPosition(true);
    } catch (e) {
      const err = e as GeolocationPositionError;
      if (err.code === 1) {
        if (id === requestId.current)
          setState({
            kind: "error",
            message:
              "Location permission was blocked. Allow location for this site in your browser settings, or type your address below.",
          });
        return;
      }
      // GPS timed out or unavailable (often indoors): fall back to network location.
      try {
        pos = await getPosition(false);
      } catch {
        if (id === requestId.current)
          setState({ kind: "error", message: "We couldn't find your location. Check that location is on, or type your address." });
        return;
      }
    }
    if (id !== requestId.current) return;
    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.max(0, pos.coords.accuracy || 0) };
    onChange(loc);
    setState({ kind: "idle" });
    const geo = await reverseGeocode(loc.lat, loc.lng);
    if (geo && id === requestId.current) onResolved(geo);
  };

  const clear = () => {
    requestId.current++;
    onChange(null);
    setState({ kind: "idle" });
  };

  if (value) {
    const rough = value.accuracy > 500;
    const outside = !inGhana(value.lat, value.lng);
    return (
      <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm" data-testid="location-pinned">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Location shared{value.accuracy ? ` (${accuracyLabel(value.accuracy)})` : ""}</p>
            <a
              href={mapsUrl(value.lat, value.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Check it on the map
            </a>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={clear} aria-label="Remove location">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {outside ? (
          <p className="text-destructive">
            This pin is outside Ghana. If that&apos;s wrong, remove it and type your address instead.
          </p>
        ) : rough ? (
          <p className="text-muted-foreground">This location is approximate — please add a landmark below so the rider can find you.</p>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={locate} loading={state.kind === "locating"}>
          <Crosshair className="mr-2 h-4 w-4" />
          Update location
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        onClick={locate}
        loading={state.kind === "locating"}
      >
        <Crosshair className="mr-2 h-4 w-4" />
        {state.kind === "locating" ? "Finding you…" : "Use my current location"}
      </Button>
      {state.kind === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Your phone will ask for permission. We only use it for this delivery.</p>
      )}
    </div>
  );
}
