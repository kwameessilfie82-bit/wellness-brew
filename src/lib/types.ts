export interface Product {
    id: string
    name: string
    description: string
    customerPrice: number
    retailPrice: number
    wholesalePrice: number
    wholesalePrice2: number
    distributorPrice: number
    image: string
  }
  
  export interface InvoiceItem extends Product {
    quantity: number
    lineTotal: number
    selectedPriceType: 'customer' | 'retail' | 'wholesale' | 'wholesale2' | 'distributor'
    currentPrice: number
  }
  
  export interface SellerInfo {
    businessName: string
    address: string
    phone: string
    email: string
    taxId: string
    logo?: string
  }
  
  export interface ClientInfo {
    name: string
    address: string
    email: string
    phone: string
  }
  
  export interface PaymentMethod {
    type: "bank" | "mobile"
    details: string
  }
  
  export interface InvoiceData {
    invoiceNumber: string
    invoiceDate: string
    dueDate: string
    showDueDate?: boolean
    seller: SellerInfo
    client: ClientInfo
    items: InvoiceItem[]
    subtotal: number
    taxRate: number
    taxAmount: number
    discount: number
    customDesignPrinting: number
    total: number
    paymentMethods: PaymentMethod[]
    notes: string
    latePaymentPolicy: string
    showLatePaymentPolicy?: boolean
  }
  