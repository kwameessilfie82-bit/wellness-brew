import { NextRequest, NextResponse } from "next/server";

import { searchStoreProducts } from "@/lib/queries/store-search";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(
      request.url,
      request.url.startsWith("http")
        ? undefined
        : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000" || "https://wellness-brew.vercel.app",
    );
    const q = url.searchParams.get("q") ?? "";
    const limit = Math.min(
      12,
      Math.max(1, parseInt(url.searchParams.get("limit") || "8", 10)),
    );

    if (!q.trim()) {
      return NextResponse.json({ products: [] });
    }

    const products = await searchStoreProducts(q, limit);

    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    console.error("Product search error:", error);
    return NextResponse.json(
      { error: "Search failed", products: [] },
      { status: 500 },
    );
  }
}
