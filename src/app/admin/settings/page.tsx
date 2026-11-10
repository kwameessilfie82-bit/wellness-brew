
import { requirePagePermission } from "@/lib/admin-auth";
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
  await requirePagePermission("canManageSettings", "/admin/settings");

  const [settings, history] = await Promise.all([
    getAllSettingsUncached(),
    getSettingHistory(),
  ]);

  return <SettingsClient initial={settings} history={history} initialTab={tab} />;
}
