import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { inventoryTable, inventoryTransactionTable, productTable } from "@/db/schema";
import { eq, and, like, or, type SQLWrapper } from "drizzle-orm";

// GET /api/admin/inventory - Get enhanced inventory with product data
const getHandler = withAdminAuth(
  async (request: NextRequest) => {
    try {
      // console.log("🔍 Inventory API - Request URL:", request.url);
      // console.log("📊 Request details:", {
      //   url: request.url,
      //   method: request.method,
      //   headers: Object.fromEntries(request.headers.entries()),
      // });
      
      // Validate and construct URL safely
      let searchParams: URLSearchParams;
      try {
        if (!request.url) {
          throw new Error("Request URL is undefined");
        }
        
        // Handle both absolute and relative URLs
        let url: URL;
        if (request.url.startsWith('http')) {
          // Absolute URL
          url = new URL(request.url);
        } else {
          // Relative URL - construct absolute URL
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
          url = new URL(request.url, baseUrl);
        }
        
        searchParams = url.searchParams;
        // console.log("✅ URL construction successful");
        // console.log("📊 Parsed URL:", {
        //   href: url.href,
        //   origin: url.origin,
        //   pathname: url.pathname,
        //   search: url.search,
        // });
      } catch (urlError) {
        console.error("❌ URL construction failed:", urlError);
        console.error("❌ Request URL:", request.url);
        console.error("❌ URL Error details:", {
          name: urlError instanceof Error ? urlError.name : 'Unknown',
          message: urlError instanceof Error ? urlError.message : String(urlError),
        });
        return NextResponse.json(
          { error: "Invalid request URL" },
          { status: 400 }
        );
      }
      
      const search = searchParams.get("search");
      const categoryId = searchParams.get("categoryId");
      const status = searchParams.get("status");
      const minimal = searchParams.get("minimal") === "1" || searchParams.get("minimal") === "true";
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = (page - 1) * limit;
      
      // console.log("📊 Query parameters:", { search, categoryId, status, page, limit, offset });

      // Build where conditions for products
      const productWhereConditions: SQLWrapper[] = [];

      if (search) {
        productWhereConditions.push(
          or(
            like(productTable.name, `%${search}%`),
            like(productTable.sku, `%${search}%`)
          )!
        );
      }

      if (categoryId) {
        productWhereConditions.push(eq(productTable.categoryId, categoryId));
      }

      // Get products with inventory data
      const products = await db.query.productTable.findMany({
        where: productWhereConditions.length > 0 ? and(...productWhereConditions) : undefined,
        with: {
          category: true,
          inventory: true,
        },
        orderBy: (products, { desc }) => [desc(products.createdAt)],
        limit,
        offset,
      });

      // Filter out products from inactive categories
      const activeProducts = products.filter(product => product.category && product.category.isActive);

      // Filter products by status if needed
      let filteredProducts = activeProducts;
      if (status === "low-stock") {
        filteredProducts = activeProducts.filter(product => {
          if (!product.inventory) return false;
          return product.inventory.quantityInStock <= product.inventory.lowStockThreshold;
        });
      } else if (status === "out-of-stock") {
        filteredProducts = activeProducts.filter(product => {
          if (!product.inventory) return false;
          return product.inventory.quantityInStock === 0;
        });
      } else if (status === "in-stock") {
        filteredProducts = activeProducts.filter(product => {
          if (!product.inventory) return false;
          return product.inventory.quantityInStock > 0 && 
                 product.inventory.quantityInStock > product.inventory.lowStockThreshold;
        });
      }

      // Get total count for pagination (skip when minimal)
      const totalCount = minimal
        ? filteredProducts.length + ((page - 1) * limit) // rough count to avoid extra query
        : activeProducts.length;

      // Get recent transactions (skip when minimal)
      const recentTransactions = minimal
        ? []
        : await db.query.inventoryTransactionTable.findMany({
            with: {
              product: true,
              performedBy: {
                with: {
                  user: {
                    columns: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
            orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
            limit: 20,
          });

      // Calculate stats (skip when minimal) - only for active categories
      let totalProducts = 0, lowStockItems = 0, outOfStockItems = 0, inStockItems = 0;
      if (!minimal) {
        // Only count products from active categories
        const activeInventory = activeProducts.map(product => product.inventory).filter(Boolean);
        totalProducts = activeInventory.length;
        lowStockItems = activeInventory.filter(inv => inv.quantityInStock <= inv.lowStockThreshold).length;
        outOfStockItems = activeInventory.filter(inv => inv.quantityInStock === 0).length;
        inStockItems = activeInventory.filter(inv =>
          inv.quantityInStock > 0 && inv.quantityInStock > inv.lowStockThreshold
        ).length;
      }

      return NextResponse.json({
        products: filteredProducts,
        recentTransactions,
        stats: minimal ? undefined : {
          totalProducts,
          lowStockItems,
          outOfStockItems,
          inStockItems,
        },
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return NextResponse.json(
        { error: "Failed to fetch inventory" },
        { status: 500 }
      );
    }
  },
  "canManageInventory"
);

export async function GET(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return getHandler(request);
}

// POST /api/admin/inventory - Create product or make inventory adjustment
const postHandler = withAdminAuth(
  async (request: NextRequest, adminUser) => {
    try {
      // console.log("🔍 POST /api/admin/inventory - Starting request processing");
      // console.log("👤 Admin user:", adminUser ? { id: adminUser.id, userId: adminUser.userId } : "null");
      
      const body = await request.json();
      // console.log("📦 Request body:", JSON.stringify(body, null, 2));
      const { action } = body;

      if (action === "create-product") {
        // console.log("🏗️ Creating new product...");
        // Handle product creation
        const {
          name,
          description,
          shortDescription,
          categoryId,
          price,
          originalPrice,
          sku,
          barcode,
          images,
          isActive = true,
          isFeatured = false,
          requiresPrescription = false,
          weight,
          dimensions,
          manufacturer,
          expiryDate,
          batchNumber,
          tags,
          seoTitle,
          seoDescription,
          initialStock = 0,
          lowStockThreshold = 10,
          reorderPoint = 5,
          reorderQuantity = 50,
        } = body;

        // console.log("✅ Validating required fields...");
        if (!name || !categoryId || !price) {
          console.log("❌ Missing required fields:", { name: !!name, categoryId: !!categoryId, price: !!price });
          return NextResponse.json(
            { error: "Name, category, and price are required" },
            { status: 400 }
          );
        }

        // Generate SKU if not provided
        const finalSku = sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        // console.log("🏷️ Final SKU:", finalSku);
        
        // Ensure SKU uniqueness
        // console.log("🔍 Checking SKU uniqueness for:", finalSku);
        const existingProduct = await db.query.productTable.findFirst({
          where: eq(productTable.sku, finalSku),
        });
        if (existingProduct) {
          // console.log("❌ SKU already exists");
          return NextResponse.json(
            { error: "Product with this SKU already exists" },
            { status: 400 }
          );
        }

        // Create slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        // console.log("🏷️ Generated slug:", slug);

        // Create new product
        const newProduct = {
          id: `prod-${Date.now()}`,
          name,
          slug,
          description: description || "",
          shortDescription: shortDescription || "",
          categoryId,
          price: price.toString(),
          originalPrice: originalPrice ? originalPrice.toString() : null,
          sku: finalSku,
          barcode: barcode || "",
          images: Array.isArray(images)
            ? JSON.stringify(images)
            : (() => {
                try {
                  const parsed = typeof images === 'string' ? JSON.parse(images) : [];
                  return JSON.stringify(Array.isArray(parsed) ? parsed : []);
                } catch {
                  return JSON.stringify(["/placeholder.svg"]);
                }
              })(),
          isActive,
          isFeatured,
          requiresPrescription,
          weight: weight ? weight.toString() : null,
          dimensions: dimensions ? JSON.stringify(dimensions) : null,
          manufacturer: manufacturer || "",
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          batchNumber: batchNumber || "",
          tags: tags ? JSON.stringify(tags) : null,
          seoTitle: seoTitle || "",
          seoDescription: seoDescription || "",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: adminUser.id,
        };

        // console.log("💾 Inserting product into database...");
        // console.log("📝 Product data:", JSON.stringify(newProduct, null, 2));
        await db.insert(productTable).values(newProduct);
        // console.log("✅ Product inserted successfully");

        // Create inventory record for the new product
        const newInventory = {
          id: `inv-${Date.now()}`,
          productId: newProduct.id,
          quantityInStock: Math.max(0, initialStock),
          quantityReserved: 0,
          quantityAvailable: Math.max(0, initialStock),
          lowStockThreshold,
          reorderPoint,
          reorderQuantity,
        lastCounted: new Date(),
        lastRestocked: initialStock > 0 ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // console.log("📦 Creating inventory record...");
        // console.log("📝 Inventory data:", JSON.stringify(newInventory, null, 2));
        await db.insert(inventoryTable).values(newInventory);
        // console.log("✅ Inventory record created successfully");

        // console.log("🎉 Product creation completed successfully");
        return NextResponse.json({ 
          message: "Product created successfully",
          product: newProduct,
        }, { status: 201 });

      } else if (action === "adjust-inventory") {
        // Handle inventory adjustment
        const { productId, type, quantity, reason, reference, notes } = body;

        if (!productId || !type || quantity === undefined || !reason) {
          return NextResponse.json(
            { error: "Product ID, type, quantity, and reason are required" },
            { status: 400 }
          );
        }

        if (!["in", "out", "adjustment"].includes(type)) {
          return NextResponse.json(
            { error: "Invalid adjustment type. Must be 'in', 'out', or 'adjustment'" },
            { status: 400 }
          );
        }

        if (!Number.isFinite(quantity)) {
          return NextResponse.json(
            { error: "Quantity must be a finite number" },
            { status: 400 }
          );
        }

        // Create transaction record
        const transaction = {
          id: `trans-${Date.now()}`,
          productId,
          type,
          quantity,
          reason,
          reference: reference || "",
          notes: notes || "",
          performedBy: adminUser.id,
          createdAt: new Date(),
        };

        await db.insert(inventoryTransactionTable).values(transaction);

        // Update inventory
        const existingInventory = await db.query.inventoryTable.findFirst({
          where: eq(inventoryTable.productId, productId),
        });

        if (!existingInventory && type === "out") {
          return NextResponse.json(
            { error: "Cannot decrease stock for a product with no existing inventory" },
            { status: 400 }
          );
        }

        if (existingInventory) {
          let delta = quantity;
          if (type === "in") {
            delta = Math.abs(quantity);
          } else if (type === "out") {
            delta = -Math.abs(quantity);
          } // adjustment: use signed quantity as-is

          const newQuantity = existingInventory.quantityInStock + delta;
          const boundedQuantityInStock = Math.max(0, newQuantity);
          const newAvailable = Math.max(0, newQuantity - existingInventory.quantityReserved);

          await db.update(inventoryTable)
            .set({
              quantityInStock: boundedQuantityInStock,
              quantityAvailable: newAvailable,
              lastCounted: new Date(),
              // If stock increased or explicit restock/in, update lastRestocked
              lastRestocked:
                delta > 0 || type === "in" || type === "restock"
                  ? new Date()
                  : existingInventory.lastRestocked,
              updatedAt: new Date(),
            })
            .where(eq(inventoryTable.productId, productId));
        } else {
          // Create new inventory record if it doesn't exist
          const initialQuantity = type === "in" ? Math.max(0, Math.abs(quantity)) : Math.max(0, quantity);
          await db.insert(inventoryTable).values({
            id: `inv-${Date.now()}`,
            productId,
            quantityInStock: initialQuantity,
            quantityReserved: 0,
            quantityAvailable: initialQuantity,
            lowStockThreshold: 10,
            reorderPoint: 5,
            reorderQuantity: 50,
            lastCounted: new Date(),
            lastRestocked: initialQuantity > 0 ? new Date() : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return NextResponse.json({ 
          message: "Inventory adjustment successful",
          transaction,
        });

      } else {
        return NextResponse.json(
          { error: "Invalid action. Must be 'create-product' or 'adjust-inventory'" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("❌ Error in inventory operation:", error);
      console.error("📊 Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { 
          error: "Failed to process request",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      );
    }
  },
  "canManageInventory"
);

export async function POST(request: NextRequest, context: { params: Promise<Record<string, never>> }) {
  await context.params;
  return postHandler(request);
}
