import { addMoney, lineTotal, round2, subtractMoney } from "@/lib/orders/money"

// Store the current invoice number in localStorage for persistence
function getCurrentInvoiceNumber(): number {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('leafyvibestea-invoice-number')
    if (stored) {
      return parseInt(stored, 10)
    }
  }
  // Start from 0068703 if no stored value
  return 68703
}

function setCurrentInvoiceNumber(number: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('leafyvibestea-invoice-number', number.toString())
  }
}

export function generateInvoiceNumber(): string {
  const currentNumber = getCurrentInvoiceNumber()
  const nextNumber = currentNumber + 1
  setCurrentInvoiceNumber(nextNumber)
  
  // Format with leading zeros to match your pattern (7 digits)
  return nextNumber.toString().padStart(7, '0')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GHS",
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function calculateLineTotal(price: number, quantity: number): number {
  return lineTotal(price, quantity)
}

export function calculateSubtotal(items: { lineTotal: number }[]): number {
  return addMoney(...items.map((item) => item.lineTotal))
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return round2((subtotal * taxRate) / 100)
}

export function calculateTotal(
  subtotal: number,
  taxAmount: number,
  discount: number,
  customDesignPrinting: number,
  deliveries: number,
): number {
  return subtractMoney(addMoney(subtotal, taxAmount, customDesignPrinting, deliveries), discount)
}
  