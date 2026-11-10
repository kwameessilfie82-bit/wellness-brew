import { formatPrice } from "@/lib/format";
import { getProductsPage } from "@/lib/products/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getPublicSettings } from "@/lib/settings/get";

export const revalidate = 3600;

/** Plain-text site summary for AI search engines (llmstxt.org). */
export async function GET() {
  const { brand, contact, locations, compliance } = await getPublicSettings();
  let products: Awaited<ReturnType<typeof getProductsPage>>["products"] = [];
  try {
    products = (await getProductsPage({ page: 1, limit: 48 })).products;
  } catch (error) {
    console.error("[llms.txt] product read failed:", error);
  }
  const place = locations.items.find((l) => l.isPublic && l.address)?.address;

  const lines = [
    `# ${brand.name}`,
    "",
    `> ${brand.description || brand.tagline}`,
    "",
    `${brand.name} sells hibiscus (${compliance.botanicalName}${compliance.commonNames ? `; also called ${compliance.commonNames}` : ""}) and herbal tea blends online, with delivery across Accra, Ghana. Prices are in Ghana cedis (GHS). Orders are placed on the website and confirmed on WhatsApp.`,
    "",
    "## Key pages",
    `- [Shop](${absoluteUrl("/shop")}): full catalogue with prices`,
    `- [About](${absoluteUrl("/about")}): brand story`,
    `- [Contact](${absoluteUrl("/contact")}): phone, WhatsApp, email and location`,
    `- [Terms](${absoluteUrl("/terms")}) and [Privacy](${absoluteUrl("/privacy")})`,
    "",
    "## Products",
    ...products.map(
      (p) =>
        `- [${p.name.trim()}](${absoluteUrl(`/shop/${encodeURIComponent(p.slug || p.id)}`)}): ${formatPrice(p.price)}${p.shortDescription ? ` — ${p.shortDescription.replace(/\s+/g, " ").trim()}` : ""}`,
    ),
    "",
    "## Contact",
    ...(contact.orderPhone ? [`- Orders: ${contact.orderPhone}`] : []),
    ...(contact.whatsappNumber ? [`- WhatsApp: ${contact.whatsappNumber}`] : []),
    ...(contact.emailHello ? [`- Email: ${contact.emailHello}`] : []),
    ...(place ? [`- Location: ${place}`] : []),
    "",
    ...(compliance.disclaimer ? ["## Note", compliance.disclaimer, ""] : []),
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
