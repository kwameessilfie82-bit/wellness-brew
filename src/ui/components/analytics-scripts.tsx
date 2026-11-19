"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";

import { useSiteSettings } from "@/lib/settings/site-settings-context";
import { captureUtm } from "@/lib/tracking/client";

/**
 * GA4 + Meta Pixel, loaded only when their IDs are set in Settings → Tracking,
 * and never on admin pages (staff traffic would skew the numbers).
 */
export function AnalyticsScripts() {
  const { tracking } = useSiteSettings();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const first = useRef(true);

  useEffect(() => {
    captureUtm();
  }, []);

  // SPA navigations: Pixel needs an explicit PageView (GA4 tracks history changes itself).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!isAdmin) window.fbq?.("track", "PageView");
  }, [pathname, isAdmin]);

  if (isAdmin) return null;
  const ga = tracking.ga4Id;
  const pixel = tracking.metaPixelId;
  return (
    <>
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`}
          </Script>
        </>
      ) : null}
      {pixel ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(pixel)});fbq('track','PageView');`}
        </Script>
      ) : null}
    </>
  );
}
