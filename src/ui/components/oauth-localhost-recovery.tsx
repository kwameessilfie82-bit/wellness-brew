"use client";

import { useEffect } from "react";

/**
 * Supabase "Site URL" is often left as http://localhost:3000. After Google sign-in,
 * users land on localhost/?code=... even from production. Forward the code to the
 * real site so PKCE cookies (set on production when sign-in started) still work.
 */
export function OAuthLocalhostRecovery() {
  useEffect(() => {
    const raw = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!raw || raw.includes("localhost")) {
      return;
    }
    const productionOrigin = raw;

    const { hostname, search } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local");

    if (!isLocal || !search.includes("code=")) {
      return;
    }

    const target = new URL("/auth/callback", productionOrigin);
    const incoming = new URLSearchParams(search);
    incoming.forEach((value, key) => {
      target.searchParams.set(key, value);
    });

    window.location.replace(target.toString());
  }, []);

  return null;
}
