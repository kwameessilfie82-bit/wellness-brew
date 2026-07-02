import { Navigation } from "@/ui/navigation"
import { Footer } from "@/ui/footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">1. Acceptance of Terms</h2>
                <p className="leading-relaxed">
                  By accessing and using the Wellness Brew website, you accept and agree to be bound by the terms and 
                  provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">2. Use License</h2>
                <p className="leading-relaxed mb-3">
                  Permission is granted to temporarily access the materials on Wellness Brew's website for personal,
                  non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose or for any public display</li>
                  <li>Attempt to reverse engineer any software contained on the website</li>
                  <li>Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">3. Products and Pricing</h2>
                <p className="leading-relaxed">
                  We strive to provide accurate product descriptions and pricing. However, we reserve the right to correct 
                  any errors, inaccuracies, or omissions and to change or update information at any time without prior notice. 
                  All prices are in Ghanaian Cedis (GHS) unless otherwise stated.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">4. Orders and Payment</h2>
                <p className="leading-relaxed mb-3">
                  When you place an order, you are making an offer to purchase products at the prices stated. We reserve the 
                  right to accept or reject your order. Payment must be received before we ship your order. We accept various 
                  payment methods as displayed on our checkout page.
                </p>
                <p className="leading-relaxed">
                  All orders are subject to product availability. If a product is out of stock, we will notify you and provide 
                  options for alternative products or a refund.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">5. Shipping and Delivery</h2>
                <p className="leading-relaxed">
                  We will ship products to the address you provide during checkout. Shipping times and costs are displayed 
                  during checkout. We are not responsible for delays caused by shipping carriers or customs. Risk of loss and 
                  title for products pass to you upon delivery to the carrier.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">6. Returns and Refunds</h2>
                <p className="leading-relaxed">
                  We want you to be completely satisfied with your purchase. If you are not satisfied, you may return 
                  unopened products within 30 days of delivery for a full refund. Products must be in their original packaging. 
                  Please contact us for return authorization before sending items back.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">7. User Accounts</h2>
                <p className="leading-relaxed">
                  If you create an account on our website, you are responsible for maintaining the confidentiality of your 
                  account and password. You agree to accept responsibility for all activities that occur under your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">8. Prohibited Uses</h2>
                <p className="leading-relaxed mb-3">You may not use our website:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>In any way that violates any applicable law or regulation</li>
                  <li>To transmit any malicious code or viruses</li>
                  <li>To collect or track personal information of others</li>
                  <li>To spam, phish, or engage in any fraudulent activity</li>
                  <li>To interfere with or disrupt the website or servers</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">9. Intellectual Property</h2>
                <p className="leading-relaxed">
                  All content on this website, including text, graphics, logos, images, and software, is the property of 
                  Wellness Brew or its content suppliers and is protected by copyright and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">10. Limitation of Liability</h2>
                <p className="leading-relaxed">
                  Wellness Brew shall not be liable for any indirect, incidental, special, consequential, or punitive damages 
                  resulting from your use of or inability to use the website or products.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">11. Changes to Terms</h2>
                <p className="leading-relaxed">
                  We reserve the right to modify these terms at any time. Your continued use of the website after any changes 
                  constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">12. Contact Information</h2>
                <p className="leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us through our contact page.
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
