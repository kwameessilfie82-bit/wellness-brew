import { ImageResponse } from "next/og";

import { formatPrice } from "@/lib/format";
import { getProductById, getProductBySlug } from "@/lib/products/server";
import { BRAND_CREAM, BRAND_GREEN, imageDataUrl, OG_SIZE } from "@/lib/seo/og-image";
import { getPublicSettings } from "@/lib/settings/get";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Product";
export const revalidate = 300;

export default async function ProductOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const value = decodeURIComponent(slug);
  const [product, { brand }] = await Promise.all([
    getProductBySlug(value).then((p) => p ?? getProductById(value)),
    getPublicSettings(),
  ]);
  const [photo, logo] = await Promise.all([
    imageDataUrl(product?.image, 900),
    imageDataUrl(brand.logoUrl || "/leafyvibestea.png", 240),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: BRAND_CREAM, fontFamily: "serif" }}>
        <div style={{ width: 630, height: 630, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" style={{ width: 630, height: 630, objectFit: "cover" }} />
          ) : logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" style={{ width: 300, objectFit: "contain" }} />
          ) : null}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "56px" }}>
          {product?.categoryName ? (
            <div style={{ fontSize: 24, letterSpacing: 3, textTransform: "uppercase", color: "#9b2d3c", marginBottom: 18 }}>
              {product.categoryName}
            </div>
          ) : null}
          <div style={{ fontSize: product && product.name.length > 28 ? 50 : 62, fontWeight: 700, color: "#1b1b1b", lineHeight: 1.1 }}>
            {product?.name ?? brand.name}
          </div>
          {product ? (
            <div style={{ fontSize: 46, fontWeight: 700, color: BRAND_GREEN, marginTop: 28 }}>{formatPrice(product.price)}</div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", marginTop: 44, fontSize: 26, color: "#444" }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" style={{ height: 48, marginRight: 14, objectFit: "contain" }} />
            ) : null}
            {brand.name}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
