import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/queries/profile";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

import { OrderForm, type OrderFormConfig } from "./order-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your details",
  robots: { index: false, follow: false },
};

export default async function OrderPage() {
  const [ordering, delivery, site, user] = await Promise.all([
    getSettings("ordering"),
    getSettings("delivery"),
    getPublicSettings(),
    getCurrentUser().catch(() => null),
  ]);
  const profile = user ? await getUserProfile(user.id).catch(() => null) : null;

  const pickupLocations = site.locations.items
    .filter((l) => l.isPublic && l.type === "pickup")
    .map((l) => ({ id: l.id, name: l.name, address: l.address, hours: l.hours, mapUrl: l.mapUrl }));

  const config: OrderFormConfig = {
    ordering: {
      acceptingOrders: ordering.acceptingOrders,
      pausedMessage: ordering.pausedMessage,
      maxQtyPerItem: ordering.maxQtyPerItem,
      maxOrderTotal: ordering.maxOrderTotal,
      largeOrderMessage: ordering.largeOrderMessage,
      momoEnabled: ordering.momoEnabled,
      bankEnabled: ordering.bankEnabled,
      codEnabled: ordering.codEnabled,
      paymentNote: ordering.paymentNote,
      consentText: ordering.consentText,
      deliveryWindows: ordering.deliveryWindows,
    },
    delivery: {
      deliveryEnabled: delivery.deliveryEnabled,
      pickupEnabled: delivery.pickupEnabled,
      zones: delivery.zones
        .filter((z) => z.isActive)
        .map((z) => ({ id: z.id, name: z.name, areas: z.areas, fee: z.fee, etaText: z.etaText })),
      allowUnlistedAreas: delivery.allowUnlistedAreas,
      freeDeliveryOver: delivery.freeDeliveryOver,
      deliveryNote: delivery.deliveryNote,
    },
    pickupLocations,
    contact: {
      whatsappNumber: site.contact.whatsappNumber,
      orderPhone: site.contact.orderPhone,
      businessHours: site.contact.businessHours,
      responseTime: site.contact.responseTime,
    },
    prefill: user
      ? {
          name: profile?.name ?? user.name ?? "",
          phone: profile?.phone ?? "",
          email: user.email ?? "",
          address: [profile?.deliveryLocation, profile?.deliveryLandmark].filter(Boolean).join(", "),
        }
      : null,
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <OrderForm config={config} />
      <Footer />
    </div>
  );
}
