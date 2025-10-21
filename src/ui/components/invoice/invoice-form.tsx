"use client"

import type { ClientInfo, SellerInfo, PaymentMethod } from "@/lib/types"
import { Input } from "@/ui/primitives/input"
import { Label } from "@/ui/primitives/label"
import { Textarea } from "@/ui/primitives/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/primitives/card"

interface InvoiceFormProps {
  seller: SellerInfo
  client: ClientInfo
  dueDate: string
  showDueDate: boolean
  taxRate: number
  discount: number
  notes: string
  latePaymentPolicy: string
  showLatePaymentPolicy: boolean
  paymentMethods: PaymentMethod[]
  onSellerChange: (seller: SellerInfo) => void
  onClientChange: (client: ClientInfo) => void
  onDueDateChange: (date: string) => void
  onShowDueDateChange: (show: boolean) => void
  onTaxRateChange: (rate: number) => void
  onDiscountChange: (discount: number) => void
  onNotesChange: (notes: string) => void
  onLatePaymentPolicyChange: (policy: string) => void
  onShowLatePaymentPolicyChange: (show: boolean) => void
  onPaymentMethodsChange: (methods: PaymentMethod[]) => void
}

export function InvoiceForm({
  seller,
  client,
  dueDate,
  showDueDate,
  taxRate,
  discount,
  notes,
  latePaymentPolicy,
  showLatePaymentPolicy,
  paymentMethods,
  onSellerChange,
  onClientChange,
  onDueDateChange,
  onShowDueDateChange,
  onTaxRateChange,
  onDiscountChange,
  onNotesChange,
  onLatePaymentPolicyChange,
  onShowLatePaymentPolicyChange,
  onPaymentMethodsChange,
}: InvoiceFormProps) {
  return (
    <div className="space-y-6">
      {/* Seller Information */}
      <Card>
        <CardHeader>
          <CardTitle>Seller Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={seller.businessName}
                onChange={(e) => onSellerChange({ ...seller, businessName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / TIN</Label>
              <Input
                id="taxId"
                value={seller.taxId}
                onChange={(e) => onSellerChange({ ...seller, taxId: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellerAddress">Address</Label>
            <Input
              id="sellerAddress"
              value={seller.address}
              onChange={(e) => onSellerChange({ ...seller, address: e.target.value })}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sellerPhone">Phone</Label>
              <Input
                id="sellerPhone"
                value={seller.phone}
                onChange={(e) => onSellerChange({ ...seller, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sellerEmail">Email</Label>
              <Input
                id="sellerEmail"
                type="email"
                value={seller.email}
                onChange={(e) => onSellerChange({ ...seller, email: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name / Business</Label>
            <Input
              id="clientName"
              value={client.name}
              onChange={(e) => onClientChange({ ...client, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clientAddress">Address</Label>
            <Input
              id="clientAddress"
              value={client.address}
              onChange={(e) => onClientChange({ ...client, address: e.target.value })}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={client.email}
                onChange={(e) => onClientChange({ ...client, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientPhone">Phone</Label>
              <Input
                id="clientPhone"
                value={client.phone}
                onChange={(e) => onClientChange({ ...client, phone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => onDueDateChange(e.target.value)} />
              <div className="flex items-center gap-2">
                <input
                  id="showDueDate"
                  type="checkbox"
                  checked={showDueDate}
                  onChange={(e) => onShowDueDateChange(e.target.checked)}
                />
                <Label htmlFor="showDueDate">Show due date on invoice</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                step="0.01"
                value={taxRate}
                onChange={(e) => onTaxRateChange(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Discount (GHS)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => onDiscountChange(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bankDetails">Bank Transfer Details</Label>
            <Textarea
              id="bankDetails"
              value={paymentMethods[0]?.details || ""}
              onChange={(e) => {
                const newMethods = [...paymentMethods]
                newMethods[0] = { type: "bank", details: e.target.value }
                onPaymentMethodsChange(newMethods)
              }}
              placeholder="Bank Name&#10;Account Number&#10;Routing Number"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobileDetails">Mobile Money Details</Label>
            <Textarea
              id="mobileDetails"
              value={paymentMethods[1]?.details || ""}
              onChange={(e) => {
                const newMethods = [...paymentMethods]
                newMethods[1] = { type: "mobile", details: e.target.value }
                onPaymentMethodsChange(newMethods)
              }}
              placeholder="Provider Name&#10;Phone Number&#10;Account Name"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes and Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Thank you for your business!"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latePaymentPolicy">Late Payment Policy</Label>
            <Textarea
              id="latePaymentPolicy"
              value={latePaymentPolicy}
              onChange={(e) => onLatePaymentPolicyChange(e.target.value)}
              placeholder="Late payments may incur additional fees..."
              rows={3}
            />
            <div className="flex items-center gap-2">
              <input
                id="showLatePaymentPolicy"
                type="checkbox"
                checked={showLatePaymentPolicy}
                onChange={(e) => onShowLatePaymentPolicyChange(e.target.checked)}
              />
              <Label htmlFor="showLatePaymentPolicy">Show late payment policy on invoice</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
