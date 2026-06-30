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

## Local development (full stack)

This app is a full e-commerce store backed by **Postgres + Supabase Auth**. Use the Supabase CLI
(Docker) to run the entire stack locally — no cloud account needed.

### Prerequisites
- Docker Desktop running
- Node.js 18+

### One-time setup
1. Start the local Supabase stack (first run pulls Docker images):
   ```bash
   npm run db:start
   ```
2. Print the local credentials and copy them into `.env.local`:
   ```bash
   npm run db:status
   ```
   Create `.env.local` (see the LOCAL DEVELOPMENT block in `.env.example`):
   ```env
   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from db:status>
   SUPABASE_SERVICE_ROLE_KEY=<service_role key from db:status>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_SERVER_APP_URL=http://localhost:3000
   OWNER_EMAILS=you@example.com
   ```
   Leave `PAYSTACK_SECRET_KEY` unset locally — checkout is mocked (orders are auto-marked paid).
3. Push the schema and seed admin roles:
   ```bash
   npm run db:setup
   ```

### Run
```bash
npm run dev
```
Then:
1. Open http://localhost:3000 and **sign up** with the email you put in `OWNER_EMAILS`
   (email confirmation is disabled locally, so you're signed in immediately).
2. Promote yourself to manager (first user only):
   ```bash
   curl -X POST http://localhost:3000/api/admin/roles/bootstrap --cookie "<your browser cookies>"
   ```
   or just visit `/admin` after signing in — or use the in-app bootstrap.
3. Go to `/admin/seed` to seed categories and the product catalog/inventory.

### Useful scripts
- `npm run db:start` / `npm run db:stop` — start/stop the Supabase stack
- `npm run db:status` — print local URLs + keys + Studio link
- `npm run db:setup` — push Drizzle schema + seed admin roles
- `npm run db:push` — push schema only
- `npm run db:reset` — reset the local database

> Google OAuth and real Paystack remain configured for production; they are intentionally bypassed
> locally (email/password auth + mocked checkout) so the full loop runs offline.

## Project Structure
