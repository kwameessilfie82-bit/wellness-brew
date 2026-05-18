"use client";

import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { useCallback, useState } from "react";

import { GHANA_REGIONS } from "@/lib/ghana";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/primitives/select";
import { Textarea } from "@/ui/primitives/textarea";

export type DeliveryLocationValue = {
  region: string;
  location: string;
  landmark: string;
  latitude?: number;
  longitude?: number;
};

type DeliveryLocationPickerProps = {
  value: DeliveryLocationValue;
  onChange: (value: DeliveryLocationValue) => void;
  regionId?: string;
  locationId?: string;
  landmarkId?: string;
};

export function DeliveryLocationPicker({
  value,
  onChange,
  regionId = "region",
  locationId = "location",
  landmarkId = "landmark",
}: DeliveryLocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const mapsSearchUrl =
    value.latitude != null && value.longitude != null
      ? `https://www.google.com/maps?q=${value.latitude},${value.longitude}`
      : value.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${value.location}, ${value.region}, Ghana`,
          )}`
        : null;

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Location is not supported on this device.");
      return;
    }

    setLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let locationText = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { Accept: "application/json" } },
          );
          const data = (await res.json()) as {
            display_name?: string;
            address?: { state?: string; region?: string };
          };
          if (data.display_name) {
            locationText = data.display_name.split(",").slice(0, 3).join(", ");
          }
          const regionGuess = data.address?.state ?? data.address?.region ?? "";
          const matchedRegion = GHANA_REGIONS.find((r) =>
            regionGuess.toLowerCase().includes(r.toLowerCase().split(" ")[0] ?? ""),
          );

          onChange({
            ...value,
            location: locationText,
            latitude,
            longitude,
            region: matchedRegion ?? value.region,
          });
        } catch {
          onChange({
            ...value,
            location: locationText,
            latitude,
            longitude,
          });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === 1
            ? "Please allow location access to auto-fill your delivery address."
            : "Could not get your location. Enter your area manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, [onChange, value]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={regionId}>Region</Label>
        <Select
          value={value.region}
          onValueChange={(region) => onChange({ ...value, region })}
          required
        >
          <SelectTrigger id={regionId}>
            <SelectValue placeholder="Select your region" />
          </SelectTrigger>
          <SelectContent>
            {GHANA_REGIONS.map((region) => (
              <SelectItem key={region} value={region}>
                {region}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="region" value={value.region} />
      </div>

      <div className="space-y-2">
        <Label htmlFor={locationId}>Area / Location</Label>
        <Textarea
          id={locationId}
          name={locationId}
          placeholder="e.g. East Legon, near A&C Mall"
          value={value.location}
          onChange={(e) => onChange({ ...value, location: e.target.value })}
          required
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Describe where we should deliver — neighbourhood, landmark, or street.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={landmarkId}>Landmark (optional)</Label>
        <Input
          id={landmarkId}
          name={landmarkId}
          placeholder="e.g. Blue gate, call when you arrive"
          value={value.landmark}
          onChange={(e) => onChange({ ...value, landmark: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          <Navigation className="mr-2 h-4 w-4" />
          {locating ? "Getting location…" : "Use my location"}
        </Button>
        {mapsSearchUrl ? (
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={mapsSearchUrl} target="_blank" rel="noopener noreferrer">
              <MapPin className="mr-2 h-4 w-4" />
              Open in Maps
              <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        ) : null}
      </div>

      {geoError ? (
        <p className="text-sm text-destructive">{geoError}</p>
      ) : null}

      {value.latitude != null && value.longitude != null ? (
        <p className="text-xs text-muted-foreground">
          GPS: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      ) : null}
    </div>
  );
}
