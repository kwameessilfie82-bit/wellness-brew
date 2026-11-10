import { redirect } from "next/navigation";

import { hasPermission, isAdmin } from "@/lib/admin-auth";
import { getAllSettingsUncached } from "@/lib/settings/get";

import { getSettingHistory } from "./actions";
import { SettingsClient } from "./settings-client";

export const metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const adminUser = await isAdmin();
  if (!adminUser) redirect("/auth/sign-in?redirect=/admin/settings");
  if (!hasPermission(adminUser, "canManageSettings")) redirect("/admin");

  const [settings, history] = await Promise.all([
    getAllSettingsUncached(),
    getSettingHistory(),
  ]);

  return <SettingsClient initial={settings} history={history} initialTab={tab} />;
}
