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
  return price * quantity
}

export function calculateSubtotal(items: { lineTotal: number }[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0)
}

export function calculateTax(subtotal: number, taxRate: number): number {
  return (subtotal * taxRate) / 100
}

export function calculateTotal(
  subtotal: number,
  taxAmount: number,
  discount: number,
  customDesignPrinting: number,
  deliveries: number,
): number {
  return subtotal + taxAmount - discount + customDesignPrinting + deliveries
}
  