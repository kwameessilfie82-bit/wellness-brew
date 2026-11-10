import type { Metadata } from "next";

import { JsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, DEFAULT_OG_IMAGES, metaDescription, SITE_URL } from "@/lib/seo/site";
import { getPublicSettings } from "@/lib/settings/get";

export async function generateMetadata(): Promise<Metadata> {
  const { brand, contact } = await getPublicSettings();
  const description = metaDescription(
    `Contact ${brand.name}: call or WhatsApp ${contact.whatsappNumber || contact.orderPhone} to order hibiscus and herbal teas with delivery in Accra.`,
  );
  return {
    title: "Contact us",
    description,
    alternates: { canonical: "/contact" },
    openGraph: { url: "/contact", title: `Contact | ${brand.name}`, description, images: DEFAULT_OG_IMAGES },
  };
}

export default async function ContactLayout({ children }: { children: React.ReactNode }) {
  const { brand } = await getPublicSettings();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: absoluteUrl("/contact"),
          name: `Contact ${brand.name}`,
          about: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      {children}
    </>
  );
}
