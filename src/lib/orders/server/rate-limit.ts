import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Fixed-window counter in Postgres (one upsert per call, atomic).
 * Returns true when the call is allowed. Fails open on DB errors so a
 * limiter outage never blocks real customers.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const rows = await db.execute<{ count: number }>(sql`
      INSERT INTO rate_limit (key, count, window_start)
      VALUES (${key}, 1, now())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit.window_start < now() - make_interval(secs => ${windowSeconds})
                     THEN 1 ELSE rate_limit.count + 1 END,
        window_start = CASE WHEN rate_limit.window_start < now() - make_interval(secs => ${windowSeconds})
                     THEN now() ELSE rate_limit.window_start END
      RETURNING count
    `);
    const count = Number((rows as unknown as { count: number }[])[0]?.count ?? 0);
    return count <= limit;
  } catch (error) {
    console.error("[rate-limit] failed open:", error);
    return true;
  }
}

/** Remove windows older than a day (called by the hourly cron). */
export async function pruneRateLimits(): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limit WHERE window_start < now() - interval '1 day'`);
}
