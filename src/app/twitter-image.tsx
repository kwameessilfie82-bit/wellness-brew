import { ImageResponse } from "next/og";

import { BRAND_CREAM, BRAND_GREEN, imageDataUrl, OG_SIZE } from "@/lib/seo/og-image";
import { getPublicSettings } from "@/lib/settings/get";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Wellness Brew — hibiscus & herbal teas from Accra";
export const revalidate = 3600;

export default async function OpengraphImage() {
  const { brand } = await getPublicSettings();
  const [logo, hero] = await Promise.all([
    imageDataUrl(brand.logoUrl || "/leafyvibestea.png", 320),
    imageDataUrl("/hibiscus.png", 700),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${BRAND_CREAM} 0%, #ffffff 55%, #fbe3e6 100%)`,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px", width: hero ? "62%" : "100%" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" style={{ height: 110, objectFit: "contain", alignSelf: "flex-start", marginBottom: 36 }} />
          ) : null}
          <div style={{ fontSize: 76, fontWeight: 700, color: BRAND_GREEN, lineHeight: 1.05 }}>{brand.name}</div>
          {brand.tagline ? (
            <div style={{ fontSize: 34, color: "#333", marginTop: 24, lineHeight: 1.3 }}>{brand.tagline}</div>
          ) : null}
          <div style={{ fontSize: 26, color: "#9b2d3c", marginTop: 36 }}>Hibiscus &amp; herbal teas · Accra, Ghana</div>
        </div>
        {hero ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "38%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" style={{ width: "90%", height: "90%", objectFit: "contain" }} />
          </div>
        ) : null}
      </div>
    ),
    size,
  );
}
