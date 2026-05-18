import type postgres from "postgres";

/**
 * Shared options for Supabase Postgres (pooler / Supavisor).
 * - prepare: false — required for transaction-pooler mode
 * - idle_timeout — avoid stale pooled connections
 */
export function createPostgresOptions(): postgres.Options<Record<string, never>> {
  return {
    prepare: false,
    connect_timeout: 30,
    idle_timeout: 20,
    max: process.env.NODE_ENV === "production" ? 10 : 5,
  };
}
