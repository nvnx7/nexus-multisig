import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  _db = drizzle(url, { schema });

  return _db;
}

export * from "./schema";
