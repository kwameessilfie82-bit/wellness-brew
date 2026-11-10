
import { requirePagePermission } from "@/lib/admin-auth";
import { getPublicSettings, getSettings } from "@/lib/settings/get";

import { InvoiceGeneratorClient } from "./invoice-generator-client";

export default async function InvoiceGeneratorPage() {
  await requirePagePermission("canManageOrders", "/admin/invoice-generator");

  const [payments, { brand, contact }] = await Promise.all([
    getSettings("payments"),
    getPublicSettings(),
  ]);

  return <InvoiceGeneratorClient payments={payments} brand={brand} contact={contact} />;
}
