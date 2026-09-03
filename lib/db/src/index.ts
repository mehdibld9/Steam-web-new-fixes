import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "SUPABASE_DATABASE_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isSupabaseDatabase = (() => {
  try {
    const hostname = new URL(databaseUrl).hostname;
    return hostname.endsWith(".supabase.co") || hostname.endsWith(".pooler.supabase.com");
  } catch {
    return false;
  }
})();

// Vercel and the session store require a Pool; keep it to one connection to
// avoid opening multiple database connections per serverless instance.
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
  keepAlive: true,
  ...(isSupabaseDatabase
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

export const db = drizzle(pool, { schema });

export * from "./schema";
