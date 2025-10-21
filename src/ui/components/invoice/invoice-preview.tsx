"use client"

import type { InvoiceData } from "@/lib/types"
import { formatCurrency, formatDate } from "@/lib/invoice-utils"
import { Card, CardContent } from "@/ui/primitives/card"
import { Separator } from "@/ui/primitives/separator"
import Image from "next/image"

interface InvoicePreviewProps {
  data: InvoiceData
}

export function InvoicePreview({ data }: InvoicePreviewProps) {
  return (
    <Card className="w-full max-w-4xl mx-auto print:shadow-none">
      <CardContent className="p-8 md:p-12 space-y-8">
         {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Image src="/NutriHealth.png" alt="NutriHealth logo" width={60} height={60} /> 
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-2xl font-bold text-foreground leading-tight">{data.seller.businessName}</h1>
                <p className="text-sm text-muted-foreground mt-1">Health & Nutrition Services</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1 mt-4">
              <p>{data.seller.address}</p>
              <p>{data.seller.phone}</p>
              <p>{data.seller.email}</p>
              <p className="font-medium">{data.seller.taxId}</p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <h2 className="text-4xl font-bold text-primary">INVOICE</h2>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-foreground">{data.invoiceNumber}</p>
              <p className="text-muted-foreground">
                <span className="font-medium">Date:</span> {formatDate(data.invoiceDate)}
              </p>
              {data.showDueDate !== false && (
                <p className="text-muted-foreground">
                  <span className="font-medium">Due:</span> {formatDate(data.dueDate)}
                </p>
              )}
            </div>
          </div>
        </div>


        <Separator />

        {/* Client Information */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Bill To</h3>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{data.client.name}</p>
            <p className="text-sm text-muted-foreground">{data.client.address}</p>
            <p className="text-sm text-muted-foreground">{data.client.email}</p>
            <p className="text-sm text-muted-foreground">{data.client.phone}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-primary">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Item</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-foreground">Description</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Qty</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Price</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-secondary">
                          <Image src={item.image || "/placeholder.svg"} alt={item.name} fill className="object-cover" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-sm text-muted-foreground">{item.description}</td>
                    <td className="py-4 px-2 text-right text-sm text-foreground">{item.quantity}</td>
                    <td className="py-4 px-2 text-right text-sm text-foreground">{formatCurrency(item.currentPrice)}</td>
                    <td className="py-4 px-2 text-right text-sm font-semibold text-foreground">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium text-foreground">{formatCurrency(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax ({data.taxRate}%):</span>
                <span className="font-medium text-foreground">{formatCurrency(data.taxAmount)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-destructive">-{formatCurrency(data.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-foreground">Total Due:</span>
                <span className="text-primary">{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Payment Information */}
        {data.paymentMethods.some((method) => method.details.trim() !== "") && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Payment Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {data.paymentMethods
                .filter((method) => method.details.trim() !== "")
                .map((method, index) => (
                  <Card key={index} className="bg-secondary">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        {method.type === "bank" ? "Bank Transfer" : "Mobile Money"}
                      </p>
                      <p className="text-sm text-foreground whitespace-pre-line">{method.details}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
            <p className="text-sm text-muted-foreground italic">
              Please use invoice number <strong>{data.invoiceNumber}</strong> as payment reference.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
          {data.notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Notes</h3>
              <p className="text-sm text-foreground">{data.notes}</p>
            </div>
          )}
                    
          {/* Electronic Signature */}
          <div className="">
            <div className="flex justify-end">
              <div className="text-center">
                <div className="mb-2">
                  <Image 
                    src="/signature.png" 
                    alt="Electronic Signature" 
                    width={100} 
                    height={40} 
                    className="object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Distributor Signature</p>
              </div>
            </div>
          </div>

          </div>

          {data.showLatePaymentPolicy !== false && data.latePaymentPolicy && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Late Payment Policy</h3>
              <p className="text-sm text-muted-foreground">{data.latePaymentPolicy}</p>
            </div>
          )}

          
          {/* Product Logos Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap justify-center items-center gap-1 md:gap-6">
              <Image src="/hprf.jpg" alt="Hibiscus Prekese" width={60} height={60} className="object-contain" />
              <Image src="/hmif.jpg" alt="Hibiscus Mint" width={60} height={60} className="object-contain" />
              <Image src="/hgf.jpg" alt="Hibiscus Ginger" width={60} height={60} className="object-contain" />
              <Image src="/hof.jpg" alt="Hibiscus Orange" width={60} height={60} className="object-contain" />
              <Image src="/hr.png" alt="Hibiscus Roots Infusions" width={60} height={60} className="object-contain" />
              <Image src="/hlgf.jpg" alt="Hibiscus Lemon Grass" width={60} height={60} className="object-contain" />
              <Image src="/hcf.jpg" alt="Hibiscus Cinnamon" width={60} height={60} className="object-contain" />
              <Image src="/hsf.jpg" alt="Hibiscus Senna" width={60} height={60} className="object-contain" />
              <Image src="/hmof.jpg" alt="Hibiscus Moringa" width={60} height={60} className="object-contain" />
              <Image src="/hpif.jpg" alt="Hibiscus Pineapple" width={60} height={60} className="object-contain" />
            </div>
          </div>
          
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">Thank you for your business!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
