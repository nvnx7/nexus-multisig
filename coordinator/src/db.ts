import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { join } from "node:path";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;

  const sqlite = new Database(join(import.meta.dir, "../coordinator.db"));
  sqlite.exec("PRAGMA journal_mode = WAL;");
  _db = drizzle(sqlite, { schema });

  return _db;
}

export * from "./schema";
