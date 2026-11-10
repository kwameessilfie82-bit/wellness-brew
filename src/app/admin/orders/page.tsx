
import { requirePagePermission } from "@/lib/admin-auth";
import {
  listOrders,
  ORDER_TAB_LABELS,
  ORDER_TABS,
  type OrderTab,
  orderTabCounts,
} from "@/lib/orders/server/staff-queries";
import { expireStaleOrders } from "@/lib/orders/server/housekeeping";
import { AdminPageHeader } from "@/ui/components/admin/admin-page-header";

import { OrdersInbox } from "./orders-inbox";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  await requirePagePermission("canManageOrders", "/admin/orders");

  const sp = await searchParams;
  const tab: OrderTab = (ORDER_TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as OrderTab) : "needs_action";
  const q = (sp.q ?? "").trim().slice(0, 80);

  // Lazy housekeeping: expiry doesn't depend on the (daily) cron.
  await expireStaleOrders().catch((e) => console.error("[orders] lazy expiry failed", e));
  const [list, counts] = await Promise.all([listOrders({ tab, q }), orderTabCounts()]);

  const rows = list.rows.map((r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    status: r.status,
    paymentStatus: r.paymentStatus,
    customerName: r.customerName,
    customerPhoneE164: r.customerPhoneE164,
    fulfilment: r.fulfilment,
    deliveryArea: r.deliveryArea,
    pickupLocationName: r.pickupLocationName,
    total: Number(r.total),
    deliveryFeeConfirmed: r.deliveryFeeConfirmed,
    channel: r.channel,
    attentionReason: r.attentionReason,
    assignedToName: r.assignedToName,
    createdAt: r.createdAt.toISOString(),
    itemCount: r.itemCount,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminPageHeader title="Orders" description="Orders placed on the website and finished on WhatsApp." />
      <OrdersInbox
        tab={tab}
        q={q}
        tabs={ORDER_TABS.map((t) => ({ key: t, label: ORDER_TAB_LABELS[t], count: counts[t] }))}
        initialRows={rows}
        initialCursor={list.nextCursor}
      />
    </div>
  );
}
