"use client"

import { useState, useRef } from "react"
import { ProductCatalog } from "@/ui/components/invoice/product-catalog"
import { InvoicePreview } from "@/ui/components/invoice/invoice-preview"
import { InvoiceForm } from "@/ui/components/invoice/invoice-form"
import { ShareInvoiceDialog } from "@/ui/components/invoice/share-invoice-dialog"
import { Button } from "@/ui/primitives/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/primitives/tabs"
import { sampleProducts } from "@/lib/sample-products"
import type { InvoiceData, InvoiceItem, Product, SellerInfo, ClientInfo, PaymentMethod } from "@/lib/types"
import {
  generateInvoiceNumber,
  calculateLineTotal,
  calculateSubtotal,
  calculateTax,
  calculateTotal,
} from "@/lib/invoice-utils"
import { Download, Share2, Loader2 } from "lucide-react"
import Image from "next/image"

export default function InvoiceGenerator() {
  const [products, setProducts] = useState<Product[]>(sampleProducts)
  const [selectedItems, setSelectedItems] = useState<Map<string, { quantity: number; priceType: 'customer' | 'retail' | 'wholesale' | 'wholesale2' | 'distributor' }>>(new Map())
  const [invoiceNumber] = useState(generateInvoiceNumber())
  const [invoiceDate] = useState(new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split("T")[0]
  })
  const [showDueDate, setShowDueDate] = useState(false)

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const [seller, setSeller] = useState<SellerInfo>({
    businessName: "NutriHealth",
    address: "Parakuo Estate, Dome, Accra",
    phone: "+233553981862",
    email: "",
    taxId: "",
  })

  const [client, setClient] = useState<ClientInfo>({
    name: "",
    address: "",
    email: "",
    phone: "",
  })

  const [taxRate, setTaxRate] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [customDesignPrinting, setCustomDesignPrinting] = useState(0)
  const [deliveries, setDeliveries] = useState(0)
  const [notes, setNotes] = useState("We appreciate your trust in NutriHealth.")
  const [latePaymentPolicy, setLatePaymentPolicy] = useState(
    "Payment is due within 90 days. Late payments may incur a 2% monthly interest charge.",
  )
  const [showLatePaymentPolicy, setShowLatePaymentPolicy] = useState(false)

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      type: "bank",
      details:
        "Bank Name: SINAPI ABA SAVINGS AND LOANS\nAccount Number: 260969426301\nAccount Name: PILLJOINT PHARMACY LTD",
    },
    {
      type: "mobile",
      details: "Provider: MTN\nMerchant ID: 974356\nMerchant Name: PillJoint Pharmacy Limited\nReference: NutriHealth\nPillJoint Contact Line: 0540734749",
    },
  ])

  const invoiceRef = useRef<HTMLDivElement>(null)

  const handleAddProduct = (product: Product) => {
    setProducts((prev) => [...prev, product])
  }

  const handleAddItem = (product: Product, priceType: 'customer' | 'retail' | 'wholesale' | 'wholesale2' | 'distributor' = 'customer') => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(product.id)
      if (current) {
        newMap.set(product.id, { 
          quantity: current.quantity + 1, 
          priceType: priceType 
        })
      } else {
        newMap.set(product.id, { quantity: 1, priceType: priceType })
      }
      return newMap
    })
  }

  const handleRemoveItem = (productId: string) => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(productId)
      if (current && current.quantity > 1) {
        newMap.set(productId, { 
          quantity: current.quantity - 1, 
          priceType: current.priceType 
        })
      } else {
        newMap.delete(productId)
      }
      return newMap
    })
  }

  const handlePriceTypeChange = (productId: string, priceType: 'customer' | 'retail' | 'wholesale' | 'wholesale2' | 'distributor') => {
    setSelectedItems((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(productId)
      if (current) {
        newMap.set(productId, { 
          quantity: current.quantity, 
          priceType: priceType 
        })
      }
      return newMap
    })
  }

  const invoiceItems: InvoiceItem[] = Array.from(selectedItems.entries())
    .map(([productId, itemData]) => {
      const product = products.find((p) => p.id === productId)
      if (!product) return null
      
      const currentPrice = itemData.priceType === 'customer' ? product.customerPrice :
                          itemData.priceType === 'retail' ? product.retailPrice :
                          itemData.priceType === 'wholesale' ? product.wholesalePrice :
                          itemData.priceType === 'wholesale2' ? product.wholesalePrice2 :
                          product.distributorPrice
      
      return {
        ...product,
        quantity: itemData.quantity,
        selectedPriceType: itemData.priceType,
        currentPrice: currentPrice,
        lineTotal: calculateLineTotal(currentPrice, itemData.quantity),
      }
    })
    .filter((item): item is InvoiceItem => item !== null)

  const subtotal = calculateSubtotal(invoiceItems)
  const taxAmount = calculateTax(subtotal, taxRate)
  const total = calculateTotal(subtotal, taxAmount, discount, customDesignPrinting, deliveries)

  const invoiceData: InvoiceData = {
    invoiceNumber,
    invoiceDate,
    dueDate,
    showDueDate,
    seller,
    client,
    items: invoiceItems,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    customDesignPrinting,
    deliveries,
    total,
    paymentMethods,
    notes,
    latePaymentPolicy,
    showLatePaymentPolicy,
  }

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return
    
    setIsGeneratingPDF(true)
    try {
      // Switch to preview tab first
      const previewTab = document.querySelector('[value="preview"]') as HTMLElement
      if (previewTab) previewTab.click()
      
      // Wait for tab switch
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Use browser's print function with proper styles
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups for this site.")
      }
      
      // Get the invoice content
      const invoiceContent = invoiceRef.current?.innerHTML
      if (!invoiceContent) {
        throw new Error("Invoice content not found")
      }
      
      // Create a complete HTML document for printing
      const printDocument = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoiceData.invoiceNumber}</title>
            <meta charset="utf-8">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: Arial, sans-serif;
                line-height: 1.4;
                color: #000;
                background: #fff;
                padding: 20px;
              }
              .card {
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 32px;
                max-width: 800px;
                margin: 0 auto;
                background: white;
              }
              .flex {
                display: flex;
              }
              .justify-between {
                justify-content: space-between;
              }
              .justify-end {
                justify-content: flex-end;
              }
              .items-start {
                align-items: flex-start;
              }
              .items-center {
                align-items: center;
              }
              .gap-4 {
                gap: 16px;
              }
              .gap-3 {
                gap: 12px;
              }
              .space-y-2 > * + * {
                margin-top: 8px;
              }
              .space-y-4 > * + * {
                margin-top: 16px;
              }
              .space-y-8 > * + * {
                margin-top: 32px;
              }
              .text-2xl {
                font-size: 24px;
                font-weight: bold;
              }
              .text-4xl {
                font-size: 36px;
                font-weight: bold;
              }
              .text-sm {
                font-size: 14px;
              }
              .text-xs {
                font-size: 12px;
              }
              .font-bold {
                font-weight: bold;
              }
              .font-semibold {
                font-weight: 600;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
              .uppercase {
                text-transform: uppercase;
              }
              .w-full {
                width: 100%;
              }
              .max-w-sm {
                max-width: 384px;
              }
              .overflow-x-auto {
                overflow-x: auto;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                padding: 12px 8px;
                text-align: left;
                border-bottom: 1px solid #ddd;
              }
              th {
                font-weight: 600;
                border-bottom: 2px solid #000;
              }
              .border-b-2 {
                border-bottom: 2px solid #000;
              }
              .border-b {
                border-bottom: 1px solid #ddd;
              }
              .py-3 {
                padding-top: 12px;
                padding-bottom: 12px;
              }
              .py-4 {
                padding-top: 16px;
                padding-bottom: 16px;
              }
              .px-2 {
                padding-left: 8px;
                padding-right: 8px;
              }
              .px-4 {
                padding-left: 16px;
                padding-right: 16px;
              }
              .py-4 {
                padding-top: 16px;
                padding-bottom: 16px;
              }
              .p-4 {
                padding: 16px;
              }
              .p-8 {
                padding: 32px;
              }
              .pt-4 {
                padding-top: 16px;
              }
              .mb-2 {
                margin-bottom: 8px;
              }
              .mb-4 {
                margin-bottom: 16px;
              }
              .mt-4 {
                margin-top: 16px;
              }
              .flex-shrink-0 {
                flex-shrink: 0;
              }
              .rounded {
                border-radius: 4px;
              }
              .rounded-lg {
                border-radius: 8px;
              }
              .overflow-hidden {
                overflow: hidden;
              }
              .bg-secondary {
                background-color: #f5f5f5;
              }
              .text-muted-foreground {
                color: #666;
              }
              .text-primary {
                color: #000;
              }
              .text-foreground {
                color: #000;
              }
              .text-destructive {
                color: #dc2626;
              }
              .whitespace-pre-line {
                white-space: pre-line;
              }
              .grid {
                display: grid;
              }
              .grid-cols-2 {
                grid-template-columns: repeat(2, 1fr);
              }
              .md\\:grid-cols-2 {
                grid-template-columns: repeat(2, 1fr);
              }
              .flex-wrap {
                flex-wrap: wrap;
              }
              .justify-center {
                justify-content: center;
              }
              .items-center {
                align-items: center;
              }
              .gap-4 {
                gap: 16px;
              }
              .gap-6 {
                gap: 24px;
              }
              .relative {
                position: relative;
              }
              .w-12 {
                width: 48px;
              }
              .h-12 {
                height: 48px;
              }
              .w-16 {
                width: 64px;
              }
              .h-16 {
                height: 64px;
              }
              .object-cover {
                object-fit: cover;
              }
              .object-contain {
                object-fit: contain;
              }
              .separator {
                height: 1px;
                background-color: #ddd;
                margin: 16px 0;
              }
              .border-t {
                border-top: 1px solid #ddd;
              }
              .border-border {
                border-color: #ddd;
              }
              .pt-4 {
                padding-top: 16px;
              }
              .pt-6 {
                padding-top: 24px;
              }
              .mt-6 {
                margin-top: 24px;
              }
              .mt-8 {
                margin-top: 32px;
              }
              .mb-2 {
                margin-bottom: 8px;
              }
              .space-y-4 > * + * {
                margin-top: 16px;
              }
              .w-full {
                width: 100%;
              }
              .max-w-sm {
                max-width: 384px;
              }
              .text-lg {
                font-size: 18px;
              }
              .text-xl {
                font-size: 20px;
              }
              .italic {
                font-style: italic;
              }
              .uppercase {
                text-transform: uppercase;
              }
              .font-medium {
                font-weight: 500;
              }
              .font-semibold {
                font-weight: 600;
              }
              .font-bold {
                font-weight: bold;
              }
              .text-muted-foreground {
                color: #666;
              }
              .text-primary {
                color: #000;
              }
              .text-foreground {
                color: #000;
              }
              .text-destructive {
                color: #dc2626;
              }
              .bg-secondary {
                background-color: #f5f5f5;
              }
              .rounded {
                border-radius: 4px;
              }
              .rounded-lg {
                border-radius: 8px;
              }
              .p-4 {
                padding: 16px;
              }
              .p-8 {
                padding: 32px;
              }
              .px-2 {
                padding-left: 8px;
                padding-right: 8px;
              }
              .px-4 {
                padding-left: 16px;
                padding-right: 16px;
              }
              .py-3 {
                padding-top: 12px;
                padding-bottom: 12px;
              }
              .py-4 {
                padding-top: 16px;
                padding-bottom: 16px;
              }
              .mb-4 {
                margin-bottom: 16px;
              }
              .mt-4 {
                margin-top: 16px;
              }
              .flex-shrink-0 {
                flex-shrink: 0;
              }
              .overflow-hidden {
                overflow: hidden;
              }
              .whitespace-pre-line {
                white-space: pre-line;
              }
              .border-b {
                border-bottom: 1px solid #ddd;
              }
              .border-b-2 {
                border-bottom: 2px solid #000;
              }
              .border-primary {
                border-color: #000;
              }
              .border-border {
                border-color: #ddd;
              }
              .border {
                border: 1px solid #ddd;
              }
              .w-12 {
                width: 48px;
              }
              .h-12 {
                height: 48px;
              }
              .w-16 {
                width: 64px;
              }
              .h-16 {
                height: 64px;
              }
              .w-32 {
                width: 128px;
              }
              .w-48 {
                width: 192px;
              }
              .max-w-4xl {
                max-width: 896px;
              }
              .mx-auto {
                margin-left: auto;
                margin-right: auto;
              }
              .space-y-2 > * + * {
                margin-top: 8px;
              }
              .space-y-8 > * + * {
                margin-top: 32px;
              }
              .leading-tight {
                line-height: 1.25;
              }
              .min-w-0 {
                min-width: 0;
              }
              .flex-1 {
                flex: 1 1 0%;
              }
              .flex-col {
                flex-direction: column;
              }
              .sm\\:flex-row {
                flex-direction: row;
              }
              .sm\\:items-center {
                align-items: center;
              }
              .sm\\:w-auto {
                width: auto;
              }
              .sm\\:text-3xl {
                font-size: 30px;
              }
              .lg\\:flex-row {
                flex-direction: row;
              }
              .lg\\:items-center {
                align-items: center;
              }
              .lg\\:justify-between {
                justify-content: space-between;
              }
              .lg\\:space-y-0 > * + * {
                margin-top: 0;
              }
              .lg\\:w-12 {
                width: 48px;
              }
              .lg\\:h-12 {
                height: 48px;
              }
              .md\\:grid-cols-2 {
                grid-template-columns: repeat(2, 1fr);
              }
              .md\\:p-12 {
                padding: 48px;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 0;
                }
                .card {
                  border: none;
                  padding: 0;
                  max-width: none;
                }
                @page {
                  margin: 0.5in;
                  /* Hide browser headers and footers */
                  @top-left { content: ""; }
                  @top-center { content: ""; }
                  @top-right { content: ""; }
                  @bottom-left { content: ""; }
                  @bottom-center { content: ""; }
                  @bottom-right { content: ""; }
                }
                /* Additional CSS to hide URL and page info */
                body::before,
                body::after {
                  display: none !important;
                }
                /* Hide any browser-generated URL display */
                .print-url,
                .browser-url,
                .page-url {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="card">
              ${invoiceContent}
            </div>
          </body>
        </html>
      `
      
      printWindow.document.write(printDocument)
      printWindow.document.close()
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Add additional CSS to hide URL after content loads
      const style = printWindow.document.createElement('style')
      style.textContent = `
        @media print {
          @page {
            margin: 0.5in;
            @top-left { content: ""; }
            @top-center { content: ""; }
            @top-right { content: ""; }
            @bottom-left { content: ""; }
            @bottom-center { content: ""; }
            @bottom-right { content: ""; }
          }
          body::before,
          body::after {
            display: none !important;
          }
        }
      `
      printWindow.document.head.appendChild(style)
      
      // Trigger print dialog
      printWindow.print()
      
      // Close the window after printing
      printWindow.onafterprint = () => printWindow.close()
      
    } catch (error) {
      console.error("PDF generation error:", error)
      alert("PDF generation failed. Please try using your browser's print function (Ctrl+P) and save as PDF.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section - Mobile Responsive */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
          {/* Logo and Title Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-12 h-12 lg:w-12 lg:h-12 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <Image src="/NutriHealth.png" alt="NutriHealth logo" width={110} height={110} className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                NutriHealth
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Professional invoice management for your healthy and tasty teas
              </p>
            </div>
          </div>
          
          {/* Action Buttons - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShareDialogOpen(true)} 
              size="lg" 
              variant="outline" 
              className="gap-2 w-full sm:w-auto"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button 
              onClick={handleDownloadPDF} 
              size="lg" 
              className="gap-2 w-full sm:w-auto" 
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isGeneratingPDF ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            {/* Selected Items Summary*/}
            {invoiceItems.length > 0 && (
                <div className="bg-card p-4 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">
                    {invoiceItems.length} item(s) selected • Subtotal:{" "}
                    <span className="font-semibold text-primary">GHS {subtotal.toFixed(2)}</span>
                  </p>
                </div>
              )}
        
            <ProductCatalog
              products={products}
              selectedItems={selectedItems}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              onPriceTypeChange={handlePriceTypeChange}
              onAddProduct={handleAddProduct}
            />
          </TabsContent>

          <TabsContent value="details">
            <InvoiceForm
              seller={seller}
              client={client}
              dueDate={dueDate}
              showDueDate={showDueDate}
              taxRate={taxRate}
              discount={discount}
              customDesignPrinting={customDesignPrinting}
              deliveries={deliveries}
              notes={notes}
              latePaymentPolicy={latePaymentPolicy}
              showLatePaymentPolicy={showLatePaymentPolicy}
              paymentMethods={paymentMethods}
              onSellerChange={setSeller}
              onClientChange={setClient}
              onDueDateChange={setDueDate}
              onShowDueDateChange={setShowDueDate}
              onTaxRateChange={setTaxRate}
              onDiscountChange={setDiscount}
              onCustomDesignPrintingChange={setCustomDesignPrinting}
              onDeliveriesChange={setDeliveries}
              onNotesChange={setNotes}
              onLatePaymentPolicyChange={setLatePaymentPolicy}
              onShowLatePaymentPolicyChange={setShowLatePaymentPolicy}
              onPaymentMethodsChange={setPaymentMethods}
            />
          </TabsContent>

          <TabsContent value="preview">
            <div id="invoice-preview" ref={invoiceRef}>
              <InvoicePreview data={invoiceData} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ShareInvoiceDialog 
        open={shareDialogOpen} 
        onOpenChange={setShareDialogOpen} 
        invoiceData={invoiceData}
      />

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block,
          .print\\:block * {
            visibility: visible;
          }
          button,
          nav,
          [role='tablist'] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
