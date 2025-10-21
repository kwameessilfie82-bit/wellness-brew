"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/primitives/dialog"
import { Button } from "@/ui/primitives/button"
import { Mail, MessageCircle, Loader2 } from "lucide-react"
import type { InvoiceData } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/invoice-utils"

interface ShareInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceData: InvoiceData
}

export function ShareInvoiceDialog({ open, onOpenChange, invoiceData }: ShareInvoiceDialogProps) {
  const [isWhatsAppSharing, setIsWhatsAppSharing] = useState(false)
  const [isEmailSharing, setIsEmailSharing] = useState(false)

  const generateInvoiceText = () => {
    const clientName = invoiceData.client.name || "Valued Client"
    
    let invoiceText = `🏢 *${invoiceData.seller.businessName}*
📍 ${invoiceData.seller.address}
📞 ${invoiceData.seller.phone}
${invoiceData.seller.email ? `📧 ${invoiceData.seller.email}` : ''}
${invoiceData.seller.taxId ? `🆔 Tax ID: ${invoiceData.seller.taxId}` : ''}

📋 *INVOICE*

📄 Invoice #: *${invoiceData.invoiceNumber}*
📅 Date: ${formatDate(invoiceData.invoiceDate)}
${invoiceData.showDueDate !== false ? `⏰ Due Date: ${formatDate(invoiceData.dueDate)}` : ''}

👤 *BILL TO:*
${clientName}
${invoiceData.client.address || 'Address not provided'}
${invoiceData.client.email ? `📧 ${invoiceData.client.email}` : ''}
${invoiceData.client.phone ? `📞 ${invoiceData.client.phone}` : ''}

🛍️ *ITEMS:*`

    // Add each item
    invoiceData.items.forEach((item, index) => {
      invoiceText += `\n${index + 1}. *${item.name}*`
      if (item.description) {
        invoiceText += `\n   📝 ${item.description}`
      }
      invoiceText += `\n   📦 Qty: ${item.quantity} × ${formatCurrency(item.currentPrice)} = ${formatCurrency(item.lineTotal)}`
    })

    invoiceText += `\n\n
💰 *TOTALS:*

💵 Subtotal: ${formatCurrency(invoiceData.subtotal)}`

    if (invoiceData.taxRate > 0) {
      invoiceText += `\n📊 Tax (${invoiceData.taxRate}%): ${formatCurrency(invoiceData.taxAmount)}`
    }

    if (invoiceData.discount > 0) {
      invoiceText += `\n🎯 Discount: -${formatCurrency(invoiceData.discount)}`
    }

    invoiceText += `\n\n💳 *TOTAL DUE: ${formatCurrency(invoiceData.total)}*`

    // Add payment methods if available
    if (invoiceData.paymentMethods.some(method => method.details.trim() !== '')) {
      invoiceText += `\n\n
💳 *PAYMENT INFORMATION:*`

      invoiceData.paymentMethods
        .filter(method => method.details.trim() !== '')
        .forEach((method) => {
          const methodType = method.type === 'bank' ? '🏦 Bank Transfer' : '📱 Mobile Money'
          invoiceText += `\n\n${methodType}:`
          invoiceText += `\n${method.details.replace(/\n/g, '\n')}`
        })

      invoiceText += `\n\n💡 *Please use invoice number ${invoiceData.invoiceNumber} as payment reference.*`
    }

    // Add notes if available
    if (invoiceData.notes) {
      invoiceText += `\n\n
📝 *NOTES:*
${invoiceData.notes}`
    }

    // Add late payment policy if available
    if (invoiceData.showLatePaymentPolicy !== false && invoiceData.latePaymentPolicy) {
      invoiceText += `\n\n⚠️ *LATE PAYMENT POLICY:*
${invoiceData.latePaymentPolicy}`
    }

    invoiceText += `\n\n
🙏 Thank you for your business!
${invoiceData.seller.businessName}`

    return invoiceText
  }

  const handleWhatsAppShare = async () => {
    setIsWhatsAppSharing(true)
    try {
      const invoiceText = generateInvoiceText()
      
      // Fix phone number formatting for WhatsApp
      let phoneNumber = invoiceData.client.phone?.replace(/\D/g, "") || ""
      
      // If phone number starts with 0, replace with country code (assuming Ghana +233)
      if (phoneNumber.startsWith("0")) {
        phoneNumber = "233" + phoneNumber.substring(1)
      }
      
      // If phone number doesn't start with country code, add it
      if (phoneNumber && !phoneNumber.startsWith("233") && !phoneNumber.startsWith("+")) {
        phoneNumber = "233" + phoneNumber
      }
      
      const whatsappUrl = phoneNumber
        ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(invoiceText)}`
        : `https://wa.me/?text=${encodeURIComponent(invoiceText)}`

      window.open(whatsappUrl, "_blank")
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error)
      alert("Failed to open WhatsApp. Please try copying the invoice details manually.")
    } finally {
      setIsWhatsAppSharing(false)
      onOpenChange(false)
    }
  }

  const handleEmailShare = async () => {
    setIsEmailSharing(true)
    try {
      const invoiceText = generateInvoiceText()
      const subject = `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.seller.businessName}`
      
      const mailtoUrl = `mailto:${invoiceData.client.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(invoiceText)}`
      
      window.location.href = mailtoUrl
      
    } catch (error) {
      console.error("Error sharing via email:", error)
    } finally {
      setIsEmailSharing(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Invoice</DialogTitle>
          <DialogDescription>Choose how you&apos;d like to share this invoice with your client.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          <Button
            onClick={handleWhatsAppShare}
            disabled={isWhatsAppSharing || isEmailSharing}
            className="w-full gap-2 bg-[#25D366] hover:bg-[#20BA5A] text-white"
            size="lg"
          >
            {isWhatsAppSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
            {isWhatsAppSharing ? "Preparing..." : "Share via WhatsApp"}
          </Button>
          <Button
            onClick={handleEmailShare}
            disabled={isWhatsAppSharing || isEmailSharing}
            variant="outline"
            className="w-full gap-2 bg-transparent"
            size="lg"
          >
            {isEmailSharing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
            {isEmailSharing ? "Preparing..." : "Share via Email"}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          {invoiceData.client.phone || invoiceData.client.email
            ? "A comprehensive text version of your invoice will be shared."
            : "Add client contact details for easier sharing."}
        </div>
      </DialogContent>
    </Dialog>
  )
}
