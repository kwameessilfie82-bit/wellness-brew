import { redirect } from "next/navigation";

import { isAdmin } from "@/lib/admin-auth";
import { getPublicSettings, getSettings } from "@/lib/settings/get";

import { InvoiceGeneratorClient } from "./invoice-generator-client";

export default async function InvoiceGeneratorPage() {
  const adminUser = await isAdmin();

  if (!adminUser) {
    redirect("/auth/sign-in?redirect=/admin/invoice-generator");
  }

  if (!adminUser.role.permissions.canManageOrders) {
    redirect("/admin");
  }

  const [payments, { brand, contact }] = await Promise.all([
    getSettings("payments"),
    getPublicSettings(),
  ]);

  return <InvoiceGeneratorClient payments={payments} brand={brand} contact={contact} />;
}
