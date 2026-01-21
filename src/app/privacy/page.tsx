import { Navigation } from "@/ui/navigation"
import { Footer } from "@/ui/footer"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      <section className="py-20 md:py-32">
        <div className="section-container">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="prose prose-lg max-w-none space-y-6 text-muted-foreground">
              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">1. Introduction</h2>
                <p className="leading-relaxed">
                  Welcome to LeafyVibesTea. We are committed to protecting your privacy and ensuring the security of your personal information. 
                  This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">2. Information We Collect</h2>
                <p className="leading-relaxed mb-3">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Name, email address, phone number, and shipping address</li>
                  <li>Payment information (processed securely through third-party payment processors)</li>
                  <li>Order history and preferences</li>
                  <li>Account credentials (if you create an account)</li>
                </ul>
                <p className="leading-relaxed mt-3">
                  We also automatically collect certain information when you visit our website, such as your IP address, 
                  browser type, device information, and usage patterns through cookies and similar technologies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">3. How We Use Your Information</h2>
                <p className="leading-relaxed mb-3">We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Process and fulfill your orders</li>
                  <li>Communicate with you about your orders and our products</li>
                  <li>Improve our website and services</li>
                  <li>Send you marketing communications (with your consent)</li>
                  <li>Detect and prevent fraud</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">4. Information Sharing</h2>
                <p className="leading-relaxed">
                  We do not sell your personal information. We may share your information with:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-3">
                  <li>Service providers who assist us in operating our website and conducting our business</li>
                  <li>Payment processors to handle transactions</li>
                  <li>Shipping companies to deliver your orders</li>
                  <li>Legal authorities when required by law</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">5. Data Security</h2>
                <p className="leading-relaxed">
                  We implement appropriate technical and organizational measures to protect your personal information against 
                  unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the 
                  Internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">6. Your Rights</h2>
                <p className="leading-relaxed mb-3">You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access and receive a copy of your personal data</li>
                  <li>Rectify inaccurate or incomplete data</li>
                  <li>Request deletion of your personal data</li>
                  <li>Object to processing of your personal data</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">7. Cookies</h2>
                <p className="leading-relaxed">
                  We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, 
                  and personalize content. You can control cookies through your browser settings, but this may affect website functionality.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">8. Changes to This Policy</h2>
                <p className="leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
                  Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-4">9. Contact Us</h2>
                <p className="leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us through our contact page or email us directly.
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
