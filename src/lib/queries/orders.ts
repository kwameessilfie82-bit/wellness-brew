import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { storeOrderTable } from "@/db/schema";

export async function fetchOrdersForUser(userId: string, limit = 50) {
  return db.query.storeOrderTable.findMany({
    where: eq(storeOrderTable.userId, userId),
    orderBy: [desc(storeOrderTable.createdAt)],
    limit,
    with: { items: true },
  });
}
