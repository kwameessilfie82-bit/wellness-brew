import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth";
import { getUserProfile } from "@/lib/queries/profile";
import { getPublicSettings, getSettings } from "@/lib/settings/get";
import { Footer } from "@/ui/footer";
import { Navigation } from "@/ui/navigation";

import { OrderForm, type OrderFormConfig } from "./order-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Send your order",
  robots: { index: false, follow: false },
};

export default async function OrderPage() {
  const [ordering, site, user] = await Promise.all([
    getSettings("ordering"),
    getPublicSettings(),
    getCurrentUser().catch(() => null),
  ]);
  const profile = user ? await getUserProfile(user.id).catch(() => null) : null;

  const config: OrderFormConfig = {
    ordering: {
      acceptingOrders: ordering.acceptingOrders,
      pausedMessage: ordering.pausedMessage,
      maxQtyPerItem: ordering.maxQtyPerItem,
      maxOrderTotal: ordering.maxOrderTotal,
      largeOrderMessage: ordering.largeOrderMessage,
    },
    contact: { whatsappNumber: site.contact.whatsappNumber, orderPhone: site.contact.orderPhone },
    prefill: user ? { name: profile?.name ?? user.name ?? "", phone: profile?.phone ?? "" } : null,
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <OrderForm config={config} />
      <Footer />
    </div>
  );
}
