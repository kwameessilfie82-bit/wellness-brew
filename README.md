# leafyvibestea

A modern, professional invoice generator built with Next.js and Tailwind CSS, specifically designed for health and nutrition businesses. Create beautiful, detailed invoices for your products and services with ease.

## Features

### 🛍️ Product Management
- **Product Catalog**: Browse and manage your health products
- **Add Custom Products**: Create new products with descriptions, prices, and images
- **Product Images**: Visual product display with placeholder support
- **Quantity Management**: Easy add/remove items with quantity controls

### 📋 Invoice Creation
- **Professional Invoice Design**: Clean, modern invoice layout
- **Complete Invoice Details**: Invoice number, dates, due dates
- **Itemized Billing**: Detailed line items with descriptions and quantities
- **Tax Calculations**: Automatic tax calculations with customizable rates
- **Discount Support**: Apply discounts to invoices
- **Subtotal & Total Calculations**: Automatic calculations for all amounts

### 👥 Business Information
- **Seller Details**: Business name, address, phone, email, tax ID
- **Client Information**: Customer details with contact information
- **Payment Methods**: Multiple payment options (bank transfer, mobile money)
- **Custom Notes**: Add notes and late payment policies

### 📱 Sharing & Export
- **PDF Generation**: Download invoices as high-quality PDF files
- **WhatsApp Sharing**: Share comprehensive text invoices via WhatsApp
- **Email Sharing**: Send detailed invoices via email
- **Professional Formatting**: Well-formatted text invoices with emojis and structure

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface built with Tailwind CSS
- **Tabbed Navigation**: Easy switching between Products, Details, and Preview
- **Real-time Preview**: See your invoice as you build it
- **Loading States**: Smooth user experience with loading indicators

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **PDF Generation**: html2canvas + jsPDF
- **TypeScript**: Full type safety
- **State Management**: React hooks

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd leafyvibestea-invoice
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Creating an Invoice

1. **Add Products**: 
   - Browse the product catalog
   - Add items to your invoice with desired quantities
   - Create custom products if needed

2. **Fill Details**:
   - Enter seller information (business details)
   - Add client information
   - Set invoice dates and payment terms
   - Configure tax rates and discounts

3. **Preview & Share**:
   - Review your invoice in the preview tab
   - Download as PDF or share via WhatsApp/Email
   - All calculations are done automatically

### Sharing Invoices

- **PDF Download**: Generates a high-quality PDF that matches the preview
- **WhatsApp**: Sends a comprehensive text version with all invoice details
- **Email**: Opens your email client with a formatted invoice message

## Project Structure
