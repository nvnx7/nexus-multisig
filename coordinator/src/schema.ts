import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ── DKG sessions ───────────────────────────────────────────────────────────
//
// round1_data: { [address]: { pubkey: [x, y], round1_pkg: SerializedRound1Pkg } }
// round2_data: { [sender]: { shares: { [recipient]: { R: [x,y]|null, ciphertext } },
//                            enc_key_shares?: { [recipient]: { R: [x,y]|null, ciphertext } } } }

export const dkgSessions = sqliteTable("dkg_sessions", {
  id: text("id").primaryKey(),
  threshold: integer("threshold").notNull(),
  creator_address: text("creator_address").notNull(),
  participants: text("participants").notNull(),
  round1_data: text("round1_data").notNull().default("{}"),
  round2_data: text("round2_data").notNull().default("{}"),
  status: text("status", { enum: ["round1", "round2", "complete"] })
    .notNull()
    .default("round1"),
  group_id: text("group_id"),
  created_at: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── Groups ─────────────────────────────────────────────────────────────────
//
// members:    [{ address: string, pubkey: [x, y] }]
// enc_shares: { [address]: { R: [x,y]|null, ciphertext: string } }

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  threshold: integer("threshold").notNull(),
  members: text("members").notNull(), // JSON: { address, pubkey }[]
  group_pubkey_x: text("group_pubkey_x").notNull(),
  group_pubkey_y: text("group_pubkey_y").notNull(),
  agg_address: text("agg_address").notNull(),
  enc_pubkey_x: text("enc_pubkey_x"),
  enc_pubkey_y: text("enc_pubkey_y"),
  enc_shares: text("enc_shares").notNull().default("{}"),
  dkg_session_id: text("dkg_session_id"),
  created_at: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── FROST signing sessions ─────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  group_id: text("group_id"),
  threshold: integer("threshold").notNull(),
  total: integer("total").notNull(),
  msg: text("msg").notNull(),
  agg_pubkey_x: text("agg_pubkey_x").notNull(),
  agg_pubkey_y: text("agg_pubkey_y").notNull(),
  agg_address: text("agg_address"),
  status: text("status", {
    enum: ["collecting_commits", "collecting_shares", "complete"],
  })
    .notNull()
    .default("collecting_commits"),
  sig_s: text("sig_s"),
  sig_e: text("sig_e"),
  created_at: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export const commits = sqliteTable(
  "commits",
  {
    session_id: text("session_id").notNull(),
    signer_index: integer("signer_index").notNull(),
    D_x: text("D_x").notNull(),
    D_y: text("D_y").notNull(),
    E_x: text("E_x").notNull(),
    E_y: text("E_y").notNull(),
  },
  (t) => [primaryKey({ columns: [t.session_id, t.signer_index] })],
);

export const shares = sqliteTable(
  "shares",
  {
    session_id: text("session_id").notNull(),
    signer_index: integer("signer_index").notNull(),
    z: text("z").notNull(),
  },
  (t) => [primaryKey({ columns: [t.session_id, t.signer_index] })],
);

// ── Inferred types ─────────────────────────────────────────────────────────

export type DkgSession = typeof dkgSessions.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Commit = typeof commits.$inferSelect;
export type Share = typeof shares.$inferSelect;
