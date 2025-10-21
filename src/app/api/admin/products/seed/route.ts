import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable, inventoryTable } from "@/db/schema";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const sampleProducts: Array<{
  name: string;
  description: string;
  shortDescription: string;
  categorySlug: string;
  price: number;
  originalPrice?: number;
  sku: string;
  manufacturer: string;
  images: string[];
  requiresPrescription?: boolean;
  weight?: number;
}> = [
  {
    name: "Paracetamol 500mg Tablets",
    description: "Effective pain relief and fever reduction. Suitable for adults and children over 12 years.",
    shortDescription: "Pain relief and fever reduction",
    categorySlug: "medicines",
    price: 8.99,
    originalPrice: 12.99,
    sku: "PAR500-001",
    manufacturer: "MediCare Pharma",
    images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60"],
    weight: 50
  },
  {
    name: "Vitamin D3 1000IU Capsules",
    description: "Essential vitamin D supplement for bone health and immune system support.",
    shortDescription: "Vitamin D supplement for bone health",
    categorySlug: "vitamins",
    price: 15.99,
    originalPrice: 19.99,
    sku: "VITD3-001",
    manufacturer: "Danebes",
    images: ["https://images.unsplash.com/photo-1550572017-edd951aa87d1?w=800&auto=format&fit=crop&q=60"],
    weight: 30
  },
  {
    name: "Blood Pressure Monitor",
    description: "Digital upper arm blood pressure monitor with large display and memory function.",
    shortDescription: "Digital blood pressure monitor",
    categorySlug: "medical-devices",
    price: 89.99,
    originalPrice: 129.99,
    sku: "BPM-001",
    manufacturer: "HealthTech Pro",
    images: ["https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&auto=format&fit=crop&q=60"],
    weight: 450
  },
  {
    name: "Baby Teething Gel",
    description: "Natural teething gel for babies with chamomile extract. Sugar-free and alcohol-free.",
    shortDescription: "Natural teething relief for babies",
    categorySlug: "mother-and-baby",
    price: 12.99,
    sku: "BTG-001",
    manufacturer: "BabyCare",
    images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60"],
    weight: 25
  },
  {
    name: "Antibacterial Hand Soap",
    description: "Gentle antibacterial hand soap with moisturizing properties. Kills 99.9% of bacteria.",
    shortDescription: "Antibacterial hand soap",
    categorySlug: "toiletries",
    price: 6.99,
    sku: "AHS-001",
    manufacturer: "CleanCare",
    images: ["https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&auto=format&fit=crop&q=60"],
    weight: 500
  },
  {
    name: "Cold & Flu Relief Tablets",
    description: "Multi-symptom relief for cold and flu symptoms including fever, headache, and congestion.",
    shortDescription: "Multi-symptom cold and flu relief",
    categorySlug: "cold-cough-and-flu",
    price: 18.99,
    originalPrice: 24.99,
    sku: "CFR-001",
    manufacturer: "ColdAway",
    images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60"],
    weight: 40
  },
  {
    name: "First Aid Kit - Family Size",
    description: "Comprehensive first aid kit with bandages, antiseptic, and emergency supplies for the whole family.",
    shortDescription: "Comprehensive family first aid kit",
    categorySlug: "first-aid",
    price: 34.99,
    originalPrice: 49.99,
    sku: "FAK-001",
    manufacturer: "SafetyFirst",
    images: ["https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&auto=format&fit=crop&q=60"],
    weight: 800
  },
  {
    name: "Antihistamine Tablets",
    description: "Fast-acting antihistamine for allergy relief. Non-drowsy formula suitable for daily use.",
    shortDescription: "Non-drowsy antihistamine for allergies",
    categorySlug: "allergy-and-hayfever",
    price: 14.99,
    sku: "AHT-001",
    manufacturer: "AllergyFree",
    images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60"],
    weight: 35
  },
  {
    name: "Eye Drops - Dry Eye Relief",
    description: "Lubricating eye drops for dry eye relief. Preservative-free formula for sensitive eyes.",
    shortDescription: "Lubricating eye drops for dry eyes",
    categorySlug: "eye-care",
    price: 11.99,
    sku: "EDR-001",
    manufacturer: "EyeCare Plus",
    images: ["https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&auto=format&fit=crop&q=60"],
    weight: 15
  },
  {
    name: "Baby Calpol Syrup",
    description: "Gentle pain and fever relief for babies from 2 months. Sugar-free strawberry flavor.",
    shortDescription: "Gentle pain relief for babies",
    categorySlug: "baby-medicine",
    price: 9.99,
    sku: "BCS-001",
    manufacturer: "BabyMed",
    images: ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60"],
    weight: 100
  },
  {
    name: "Electric Toothbrush",
    description: "Rechargeable electric toothbrush with 2-minute timer and multiple brushing modes.",
    shortDescription: "Rechargeable electric toothbrush",
    categorySlug: "dental-care",
    price: 45.99,
    originalPrice: 69.99,
    sku: "ETB-001",
    manufacturer: "DentalPro",
    images: ["https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=800&auto=format&fit=crop&q=60"],
    weight: 200
  },
  {
    name: "Foot Care Cream",
    description: "Moisturizing foot cream with tea tree oil for dry, cracked feet. Fast-absorbing formula.",
    shortDescription: "Moisturizing foot cream with tea tree oil",
    categorySlug: "foot-care",
    price: 8.99,
    sku: "FCC-001",
    manufacturer: "FootCare",
    images: ["https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&auto=format&fit=crop&q=60"],
    weight: 100
  },
  {
    name: "Antacid Tablets",
    description: "Fast-acting antacid for heartburn and indigestion relief. Mint flavor.",
    shortDescription: "Fast-acting antacid for heartburn",
    categorySlug: "digestion-and-stomach",
    price: 7.99,
    sku: "AAT-001",
    manufacturer: "DigestCare",
    images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60"],
    weight: 30
  },
  {
    name: "Feminine Hygiene Wash",
    description: "Gentle pH-balanced intimate wash for daily use. Dermatologically tested.",
    shortDescription: "pH-balanced intimate wash",
    categorySlug: "feminine-care",
    price: 13.99,
    sku: "FHW-001",
    manufacturer: "FemCare",
    images: ["https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&auto=format&fit=crop&q=60"],
    weight: 250
  },
  {
    name: "Ibuprofen 400mg Tablets",
    description: "Anti-inflammatory pain relief for headaches, muscle pain, and inflammation.",
    shortDescription: "Anti-inflammatory pain relief",
    categorySlug: "pain-relief",
    price: 16.99,
    originalPrice: 22.99,
    sku: "IBU400-001",
    manufacturer: "PainRelief Co",
    images: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60"],
    weight: 45
  }
];

const handler = withAdminAuth(async (_request: NextRequest, adminUser) => {
  try {
    const now = new Date();

    // Get all categories to map slugs to IDs
    const categories = await db.query.categoryTable.findMany();
    const categorySlugToId = new Map(categories.map(c => [c.slug, c.id]));

    // Build products list
    const toInsert = sampleProducts.map((p, index) => ({
      id: `prod-${p.sku.toLowerCase()}`,
      name: p.name.trim(),
      slug: slugify(p.name),
      description: p.description,
      shortDescription: p.shortDescription,
      categoryId: categorySlugToId.get(p.categorySlug) || categories[0]?.id,
      price: p.price.toString(),
      originalPrice: p.originalPrice?.toString() || null,
      sku: p.sku,
      barcode: `BC${p.sku}`,
      images: JSON.stringify(p.images),
      isActive: true,
      isFeatured: index < 5, // First 5 products are featured
      requiresPrescription: p.requiresPrescription || false,
      weight: p.weight?.toString() || null,
      manufacturer: p.manufacturer,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser.id,
    }));

    // Check existing products
    const existing = await db.query.productTable.findMany();
    const existingSkus = new Set(existing.map(p => p.sku));

    const newProducts = toInsert.filter(p => !existingSkus.has(p.sku));

    if (newProducts.length > 0) {
      // Insert products
      await db.insert(productTable).values(newProducts);

      // Insert inventory for each product
      const inventoryRecords = newProducts.map(p => ({
        id: `inv-${p.id}`,
        productId: p.id,
        quantityInStock: Math.floor(Math.random() * 100) + 10, // Random stock 10-110
        quantityReserved: 0,
        quantityAvailable: Math.floor(Math.random() * 100) + 10,
        lowStockThreshold: 10,
        reorderPoint: 5,
        reorderQuantity: 50,
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(inventoryTable).values(inventoryRecords);
    }

    return NextResponse.json({
      inserted: newProducts.length,
      skipped: toInsert.length - newProducts.length,
      totalAfter: existing.length + newProducts.length,
      products: newProducts,
    });
  } catch (error) {
    console.error("Error seeding products:", error);
    return NextResponse.json({ error: "Failed to seed products" }, { status: 500 });
  }
}, "canManageProducts");

export async function POST(_request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return handler(_request);
}
