import type postgres from "postgres";

/** Positive integer from env, or the fallback. */
function intFromEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Shared options for Supabase Postgres (pooler / Supavisor).
 * - prepare: false — required for transaction-pooler mode
 * - max — per-instance pool. On Vercel every function instance has its own
 *   pool, so this multiplies by instance count; keep it small and let
 *   Supavisor multiplex. Override with DB_POOL_MAX if needed.
 * - idle_timeout / max_lifetime — recycle connections so a long-lived
 *   (Fluid Compute) instance never holds stale or rebalanced ones.
 */
export function createPostgresOptions(): postgres.Options<Record<string, never>> {
  const isProd = process.env.NODE_ENV === "production";
  return {
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    max: intFromEnv("DB_POOL_MAX", isProd ? 3 : 5),
  };
}
