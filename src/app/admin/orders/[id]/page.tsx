import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { productTable } from "@/db/schema";
import { requirePagePermission } from "@/lib/admin-auth";
import { parsePrice } from "@/lib/format";
import { getOrderDetail, listStaff } from "@/lib/orders/server/staff-queries";
import { orderLink } from "@/lib/orders/server/view";
import { WHATSAPP_TEMPLATE_INFO, type WhatsappTemplateKey } from "@/lib/settings/ordering-schemas";

import { OrderDetail } from "./order-detail";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("canManageOrders", `/admin/orders/${id}`);

  const [detail, staff, products] = await Promise.all([
    getOrderDetail(id),
    listStaff(),
    db
      .select({ id: productTable.id, name: productTable.name, price: productTable.price })
      .from(productTable)
      .where(eq(productTable.isActive, true))
      .orderBy(asc(productTable.name)),
  ]);
  if (!detail) notFound();
  const { order, items, events, otherOrders } = detail;

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return (
    <OrderDetail
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        channel: order.channel,
        status: order.status,
        paymentStatus: order.paymentStatus,
        version: order.version,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerPhoneE164: order.customerPhoneE164,
        customerEmail: order.customerEmail,
        fulfilment: order.fulfilment,
        shippingAddress: order.shippingAddress,
        deliveryArea: order.deliveryArea,
        gpsAddress: order.gpsAddress,
        deliveryLat: order.deliveryLat,
        deliveryLng: order.deliveryLng,
        locationAccuracyM: order.locationAccuracyM,
        deliveryFeeConfirmed: order.deliveryFeeConfirmed,
        pickupLocationName: order.pickupLocationName,
        deliveryWindow: order.deliveryWindow,
        isGift: order.isGift,
        recipientName: order.recipientName,
        recipientPhone: order.recipientPhone,
        giftMessage: order.giftMessage,
        preferredPayment: order.preferredPayment,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference,
        amountPaid: parsePrice(order.amountPaid),
        subtotal: parsePrice(order.subtotal),
        deliveryFee: parsePrice(order.shipping),
        total: parsePrice(order.total),
        notes: order.notes,
        deliveryCode: order.deliveryCode,
        riderFailedAttempts: order.riderFailedAttempts,
        deliveredAt: iso(order.deliveredAt),
        deliveryProof: order.deliveryProof,
        assignedTo: order.assignedTo,
        cancelReason: order.cancelReason,
        attentionReason: order.attentionReason,
        createdAt: order.createdAt.toISOString(),
      }}
      items={items.map((i) => ({
        id: i.id,
        productId: i.productId,
        name: i.productName,
        price: parsePrice(i.price),
        quantity: i.quantity,
      }))}
      events={events
        .map((e) => ({
          id: e.id,
          type: e.type,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          data: (e.data ?? null) as Record<string, unknown> | null,
          actorType: e.actorType,
          actorName: e.actorName,
          createdAt: e.createdAt.toISOString(),
        }))
        .reverse()}
      otherOrders={otherOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: parsePrice(o.total),
        createdAt: o.createdAt.toISOString(),
      }))}
      staff={staff.map((s) => ({ id: s.id, name: s.name || s.email }))}
      products={products.map((p) => ({ id: p.id, name: p.name.trim(), price: parsePrice(p.price) }))}
      templateLabels={Object.fromEntries(
        (Object.keys(WHATSAPP_TEMPLATE_INFO) as WhatsappTemplateKey[]).map((k) => [k, WHATSAPP_TEMPLATE_INFO[k].label]),
      )}
      customerLink={order.publicToken ? orderLink(order.publicToken) : null}
    />
  );
}
