"use client"

import { Facebook, Instagram, Linkedin, MessageCircle, Twitter, Youtube } from "lucide-react"
import Link from "next/link"

import { telLink } from "@/lib/settings/schemas"
import { useSiteSettings } from "@/lib/settings/site-settings-context"

const SOCIAL_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  x: Twitter,
  whatsapp: MessageCircle,
  tiktok: MessageCircle,
  other: MessageCircle,
} as const

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  other: "Social profile",
}

export function Footer() {
  const { brand, contact, social, compliance, payment } = useSiteSettings()
  const registrations = compliance.registrations.filter((r) => r.status === "approved" && r.number)
  const footerSocial = social.items.filter((s) => s.showInFooter)
  return (
    <footer className="bg-card border-t border-border mt-20">
      <div className="section-container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="mb-4 font-serif text-lg font-bold text-brand">{brand.name}</h3>
            {brand.tagline ? <p className="text-muted-foreground text-sm">{brand.tagline}</p> : null}
            {contact.orderPhone ? (
              <a
                href={telLink(contact.orderPhone)}
                className="mt-2 block text-sm text-muted-foreground transition hover:text-brand"
              >
                Orders: {contact.orderPhone}
              </a>
            ) : null}
            {contact.enquiryPhone ? (
              <a
                href={telLink(contact.enquiryPhone)}
                className="block text-sm text-muted-foreground transition hover:text-brand"
              >
                Enquiries: {contact.enquiryPhone}
              </a>
            ) : null}
            {payment.momoNumber ? (
              <p className="text-sm text-muted-foreground">
                Pay ({payment.momoProvider || "MoMo"}): <span className="font-medium text-foreground">{payment.momoNumber}</span>
                {payment.momoMerchantName ? <span className="block text-xs">Name: {payment.momoMerchantName}</span> : null}
              </p>
            ) : null}
            {contact.emailHello ? (
              <a
                href={`mailto:${contact.emailHello}`}
                className="block text-sm text-muted-foreground transition hover:text-brand"
              >
                {contact.emailHello}
              </a>
            ) : null}
            {footerSocial.length > 0 ? (
              <div className="mt-4 flex gap-3">
                {footerSocial.map((s) => {
                  const Icon = SOCIAL_ICONS[s.platform]
                  return (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={PLATFORM_NAMES[s.platform]}
                      className="text-muted-foreground transition hover:text-brand"
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  )
                })}
              </div>
            ) : null}
          </div>
          <div>
            <h4 className="font-semibold mb-4">Shop</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/shop" className="text-sm text-muted-foreground transition hover:text-brand">
                All Products
              </Link>
              <Link
                href="/shop?category=herbal"
                className="text-sm text-muted-foreground transition hover:text-brand"
              >
                Herbal
              </Link>
              <Link href="/shop?category=hibiscus" className="text-sm text-muted-foreground transition hover:text-brand">
                Hibiscus Tea
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className="text-sm text-muted-foreground transition hover:text-brand">
                About Us
              </Link>
              <Link href="/contact" className="text-sm text-muted-foreground transition hover:text-brand">
                Contact
              </Link>
            </nav>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm text-muted-foreground transition hover:text-brand">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground transition hover:text-brand">
                Terms of Service
              </Link>
            </nav>
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          {compliance.showDisclaimerInFooter && compliance.disclaimer ? (
            <p className="mx-auto mb-3 max-w-3xl text-xs leading-relaxed">{compliance.disclaimer}</p>
          ) : null}
          {registrations.length > 0 ? (
            <p className="mb-3 text-xs">
              {registrations.map((r) => `${r.label}: ${r.number}`).join(" · ")}
            </p>
          ) : null}
          <p>&copy; {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
