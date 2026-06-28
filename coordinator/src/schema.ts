import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
// members:        [{ address: string, pubkey: [x, y] }]
// enc_shares:      { [address]: { R: [x,y]|null, ciphertext: string } }
// group_view_key:  { [address]: string } — the common view key, ECIES-encrypted
//                  to each member's personal view key

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  threshold: integer("threshold").notNull(),
  members: text("members").notNull(), // JSON: { address, pubkey }[]
  group_pubkey_x: text("group_pubkey_x").notNull(),
  group_pubkey_y: text("group_pubkey_y").notNull(),
  group_address: text("group_address").notNull(),
  enc_pubkey_x: text("enc_pubkey_x"),
  enc_pubkey_y: text("enc_pubkey_y"),
  enc_shares: text("enc_shares").notNull().default("{}"),
  group_view_key: text("group_view_key").notNull().default("{}"),
  dkg_session_id: text("dkg_session_id"),
  created_at: integer("created_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── FROST signing sessions ─────────────────────────────────────────────────
//
// A sign_session is a proposed UTXO transaction plus the FROST ceremony state,
// all in one row (no separate commits/shares tables):
//   tx_details:        the fully-pinned witness + ext_data (see ui TxDetails)
//   tx_hash:           the signing message (= deriveTransactMsg), for integrity
//   nonce_commitments: { [address]: SerializedNonceCommitments }   — the signer set
//   enc_nonces:        { [address]: eciesBlobHex }                 — each committer's
//                      own nonces, ECIES-encrypted to their personal view key
//   sig_shares:        { [address]: z }                            — sign phase

export const signSessions = sqliteTable("sign_sessions", {
  id: text("id").primaryKey(),
  group_address: text("group_address").notNull(),
  proposer: text("proposer").notNull(),
  tx_details: text("tx_details").notNull(),
  tx_hash: text("tx_hash").notNull(),
  threshold: integer("threshold").notNull(),
  nonce_commitments: text("nonce_commitments").notNull().default("{}"),
  enc_nonces: text("enc_nonces").notNull().default("{}"),
  sig_shares: text("sig_shares").notNull().default("{}"),
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

// ── Inferred types ─────────────────────────────────────────────────────────

export type DkgSession = typeof dkgSessions.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type SignSession = typeof signSessions.$inferSelect;
