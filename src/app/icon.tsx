import { ImageResponse } from "next/og";

import { imageDataUrl } from "@/lib/seo/og-image";

const SIZES = [32, 192, 512] as const;

export function generateImageMetadata() {
  return SIZES.map((size) => ({ id: String(size), size: { width: size, height: size }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string> | string }) {
  const size = Number(await id) || 32;
  const logo = await imageDataUrl("/leafyvibestea.png", size * 2);
  // Maskable-safe: logo sits inside the central 80% on white.
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: size * 0.6, color: "#2d6a4f", fontWeight: 700 }}>W</div>
        )}
      </div>
    ),
    { width: size, height: size },
  );
}
