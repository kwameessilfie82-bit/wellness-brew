"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";

import { useCurrentUser } from "@/lib/auth-client";
import {
  DeliveryLocationPicker,
  type DeliveryLocationValue,
} from "@/ui/components/delivery-location-picker";
import { Button } from "@/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/primitives/card";
import { Input } from "@/ui/primitives/input";
import { Label } from "@/ui/primitives/label";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/ui/primitives/avatar";
import { Separator } from "@/ui/primitives/separator";

type ProfileData = {
  name: string;
  email: string;
  image: string | null;
  phone: string | null;
  deliveryRegion: string | null;
  deliveryLocation: string | null;
  deliveryLandmark: string | null;
  deliveryLatitude: string | null;
  deliveryLongitude: string | null;
};

export function ProfilePageClient() {
  const { user, isPending } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryLocationValue>({
    region: "",
    location: "",
    landmark: "",
  });

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      window.location.href = `/auth/sign-in?next=${encodeURIComponent("/account/profile")}`;
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/account/profile");
        if (!res.ok) throw new Error("Failed to load profile");
        const { profile } = (await res.json()) as { profile: ProfileData };
        setName(profile.name ?? user.name);
        setPhone(profile.phone ?? "");
        setImage(profile.image ?? user.image);
        setDelivery({
          region: profile.deliveryRegion ?? "",
          location: profile.deliveryLocation ?? "",
          landmark: profile.deliveryLandmark ?? "",
          latitude: profile.deliveryLatitude
            ? Number(profile.deliveryLatitude)
            : undefined,
          longitude: profile.deliveryLongitude
            ? Number(profile.deliveryLongitude)
            : undefined,
        });
      } catch {
        setName(user.name);
        setImage(user.image);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isPending, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          deliveryRegion: delivery.region,
          deliveryLocation: delivery.location,
          deliveryLandmark: delivery.landmark,
          deliveryLatitude: delivery.latitude,
          deliveryLongitude: delivery.longitude,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/account"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Account
          </Link>

          <h1 className="mb-8 font-serif text-4xl font-bold md:text-5xl">My Profile</h1>

          <form onSubmit={handleSave} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={image ?? undefined} alt={name} />
                    <AvatarFallback>
                      {name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{name || "Your name"}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="024 123 4567"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Label>
                  <Input value={user?.email ?? ""} disabled className="mt-1 bg-muted" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    From your Google account — cannot be changed here
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Default delivery address
                </CardTitle>
                <CardDescription>
                  Pre-filled at checkout. Use GPS or Maps to set your location.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryLocationPicker value={delivery} onChange={setDelivery} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>You sign in with Google. Password is managed by Google.</p>
                <Button type="button" variant="outline" asChild>
                  <Link href="/auth/sign-out">Sign out of all devices</Link>
                </Button>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save profile"
              )}
            </Button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
