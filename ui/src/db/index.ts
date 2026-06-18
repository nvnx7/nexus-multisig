import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { join } from "node:path";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;

  const sqlite = new Database(join(process.cwd(), "coordinator.db"));
  sqlite.pragma("journal_mode = WAL");

  _db = drizzle(sqlite, { schema });

  // Apply versioned SQL migrations from ./drizzle/
  migrate(_db, { migrationsFolder: join(process.cwd(), "drizzle") });

  // Column-level migrations for existing DBs that predate the Drizzle schema.
  // ALTER TABLE ADD COLUMN is idempotent via PRAGMA check; safe to run every boot.
  const groupCols = (
    sqlite.prepare("PRAGMA table_info(groups)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!groupCols.includes("enc_pubkey_x")) {
    sqlite.exec("ALTER TABLE groups ADD COLUMN enc_pubkey_x TEXT");
    sqlite.exec("ALTER TABLE groups ADD COLUMN enc_pubkey_y TEXT");
  }

  return _db;
}

export * from "./schema";
