import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Client, Pool } = pg;

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

export const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 8_000,
  keepAlive: true,
  // Supabase requires TLS for hosted Postgres connections. The hosted
  // certificate chain is managed by Supabase, not by this serverless bundle.
  ...(isSupabaseDatabase
    ? { ssl: { rejectUnauthorized: false } }
    : {}),
});

// Use one direct connection instead of maintaining a connection pool.
await client.connect();

export const db = drizzle(client, { schema });

export * from "./schema";
