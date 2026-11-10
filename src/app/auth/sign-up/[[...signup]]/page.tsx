import { SYSTEM_CONFIG } from "@/app";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getSettings } from "@/lib/settings/get";

import { SignUpPageClient } from "./page.client";

export default async function SignUpPage() {
  await getCurrentUserOrRedirect(
    undefined,
    SYSTEM_CONFIG.redirectAfterSignIn,
    true,
  );

  // Same images as the homepage blend showcase (Settings → Homepage).
  const { showcase } = await getSettings("homepage");
  return <SignUpPageClient slides={showcase.map((s) => ({ url: s.url, title: s.title }))} />;
}
