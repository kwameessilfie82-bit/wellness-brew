"use client"

import { Navigation } from "@/ui/navigation"
import { Footer } from "@/ui/footer"
import { Button } from "@/ui/primitives/button"
import { Input } from "@/ui/primitives/input"
import { Textarea } from "@/ui/primitives/textarea"
import { Label } from "@/ui/primitives/label"
import { Clock, Mail, Phone, MapPin, Wallet } from "lucide-react"
import { telLink } from "@/lib/settings/schemas"
import { useSiteSettings } from "@/lib/settings/site-settings-context"

const LOCATION_TYPE_LABELS = {
  pickup: "Pickup point",
  correspondence: "Correspondence address",
  retail: "Stockist",
  event: "Event",
} as const

export default function ContactPage() {
  const { contact, locations, payment } = useSiteSettings()
  const publicLocations = locations.items.filter((l) => l.isPublic)

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="mb-4 font-serif text-5xl font-bold text-heading md:text-6xl">
                Get in Touch
              </h1>
              <p className="text-lg text-muted-foreground">
                We'd love to hear from you. Send us a message and we'll respond as soon as possible.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                {contact.emailHello ? (
                  <div className="flex gap-4">
                    <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Email</h3>
                      <p className="text-muted-foreground">
                        <a href={`mailto:${contact.emailHello}`} className="hover:text-brand">{contact.emailHello}</a>
                      </p>
                      {contact.emailOrders ? (
                        <p className="text-muted-foreground">
                          Orders:{" "}
                          <a href={`mailto:${contact.emailOrders}`} className="hover:text-brand">{contact.emailOrders}</a>
                        </p>
                      ) : null}
                      {contact.emailB2B ? (
                        <p className="text-muted-foreground">
                          Corporate &amp; gifting:{" "}
                          <a href={`mailto:${contact.emailB2B}`} className="hover:text-brand">{contact.emailB2B}</a>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : contact.emailOrders || contact.emailB2B ? (
                  <div className="flex gap-4">
                    <Mail className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Email</h3>
                      {contact.emailOrders ? (
                        <p className="text-muted-foreground">
                          Orders:{" "}
                          <a href={`mailto:${contact.emailOrders}`} className="hover:text-brand">{contact.emailOrders}</a>
                        </p>
                      ) : null}
                      {contact.emailB2B ? (
                        <p className="text-muted-foreground">
                          Corporate &amp; gifting:{" "}
                          <a href={`mailto:${contact.emailB2B}`} className="hover:text-brand">{contact.emailB2B}</a>
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="flex gap-4">
                  <Phone className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Phone</h3>
                    <p className="text-muted-foreground">
                      Orders:{" "}
                      <a href={telLink(contact.orderPhone)} className="hover:text-brand">{contact.orderPhone}</a>
                    </p>
                    {contact.enquiryPhone ? (
                      <p className="text-muted-foreground">
                        Enquiries:{" "}
                        <a href={telLink(contact.enquiryPhone)} className="hover:text-brand">{contact.enquiryPhone}</a>
                      </p>
                    ) : null}
                    {contact.otherPhones
                      .filter((p) => p.number)
                      .map((p) => (
                        <p key={p.id} className="text-muted-foreground">
                          {p.label ? `${p.label}: ` : ""}
                          <a href={telLink(p.number)} className="hover:text-brand">{p.number}</a>
                        </p>
                      ))}
                  </div>
                </div>
                {payment.momoNumber ? (
                  <div className="flex gap-4">
                    <Wallet className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Payment</h3>
                      <p className="text-muted-foreground">
                        {payment.momoProvider || "Mobile"} Mobile Money:{" "}
                        <span className="font-medium text-foreground">{payment.momoNumber}</span>
                      </p>
                      {payment.momoMerchantName ? (
                        <p className="text-muted-foreground">Name: {payment.momoMerchantName}</p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        Please confirm your order on WhatsApp before paying, and use your order number as the reference.
                      </p>
                    </div>
                  </div>
                ) : null}
                {contact.businessHours || contact.responseTime ? (
                  <div className="flex gap-4">
                    <Clock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Hours</h3>
                      {contact.businessHours ? (
                        <p className="text-muted-foreground">{contact.businessHours}</p>
                      ) : null}
                      {contact.responseTime ? (
                        <p className="text-muted-foreground">{contact.responseTime}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {publicLocations.map((loc) => (
                  <div key={loc.id} className="flex gap-4">
                    <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{loc.name}</h3>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {LOCATION_TYPE_LABELS[loc.type]}
                      </p>
                      {loc.address ? <p className="text-muted-foreground">{loc.address}</p> : null}
                      {loc.hours ? <p className="text-muted-foreground">{loc.hours}</p> : null}
                      {loc.mapUrl ? (
                        <a
                          href={loc.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-brand hover:underline"
                        >
                          View on map
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="your@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Your message" rows={5} />
                </div>
                <Button type="submit" className="w-full">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
