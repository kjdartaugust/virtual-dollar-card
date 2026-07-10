import { Pool, type PoolClient } from "@neondatabase/serverless";

// Server-only Neon Postgres access. If DATABASE_URL is unset the app runs in
// demo mode (client-side localStorage) and none of this is used.

const url = process.env.DATABASE_URL;

export const backendEnabled = !!url;

let pool: Pool | null = null;

function getPool(): Pool {
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!pool) pool = new Pool({ connectionString: url });
  return pool;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = any>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

// Atomic multi-statement operations (funding, issuance, spend).
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
