import { ImageResponse } from "next/og";

import { imageDataUrl } from "@/lib/seo/og-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const logo = await imageDataUrl("/leafyvibestea.png", 360);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" style={{ width: "82%", height: "82%", objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 110, color: "#2d6a4f", fontWeight: 700 }}>W</div>
        )}
      </div>
    ),
    size,
  );
}
