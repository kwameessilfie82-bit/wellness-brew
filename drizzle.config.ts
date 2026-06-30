import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load local overrides first (.env.local), then fall back to .env.
config({ path: [".env.local", ".env"] });

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  schemaFilter: ["public"],
});
