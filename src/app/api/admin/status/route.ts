import { NextRequest, NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/admin-middleware";
import { db } from "@/db";
import { productTable } from "@/db/schema";

// GET /api/admin/status - Check system status
const getHandler = withAdminAuth(
  async () => {
    try {
      // console.log("🔍 Checking system status...");
      
      // Test database connection
      const productCount = await db.$count(productTable);
      // console.log("📊 Product count:", productCount);
      
      return NextResponse.json({
        status: "healthy",
        database: "connected",
        productCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // console.error("❌ Status check failed:", error);
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "disconnected",
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
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