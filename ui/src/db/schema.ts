import { sql } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ── Users ──────────────────────────────────────────────────────────────────

// address is the Stellar G… address (not the shielded Poseidon hash).
// pubkey_x / pubkey_y are the BabyJubJub spend-key coordinates from pool.register().
// enc_key is the X25519 view-key (32 bytes hex) from pool.register().
export const users = sqliteTable("users", {
  address: text("address").primaryKey(),
  pubkey_x: text("pubkey_x").notNull(),
  pubkey_y: text("pubkey_y").notNull(),
  enc_key: text("enc_key").notNull().default(""),
  created_at: integer("created_at").notNull().default(sql`(unixepoch())`),
});

// ── Groups ─────────────────────────────────────────────────────────────────

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  threshold: integer("threshold").notNull(),
  total: integer("total").notNull(),
  agg_pubkey_x: text("agg_pubkey_x").notNull(),
  agg_pubkey_y: text("agg_pubkey_y").notNull(),
  agg_address: text("agg_address").notNull(),
  enc_pubkey_x: text("enc_pubkey_x"),
  enc_pubkey_y: text("enc_pubkey_y"),
  status: text("status", { enum: ["pending", "active"] })
    .notNull()
    .default("pending"),
  created_at: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    group_id: text("group_id")
      .notNull()
      .references(() => groups.id),
    address: text("address").notNull(),
    pubkey_x: text("pubkey_x").notNull(),
    pubkey_y: text("pubkey_y").notNull(),
  },
  (t) => [primaryKey({ columns: [t.group_id, t.address] })],
);

export const encryptedShares = sqliteTable(
  "encrypted_shares",
  {
    group_id: text("group_id")
      .notNull()
      .references(() => groups.id),
    address: text("address").notNull(),
    R_x: text("R_x").notNull(),
    R_y: text("R_y").notNull(),
    ciphertext: text("ciphertext").notNull(),
  },
  (t) => [primaryKey({ columns: [t.group_id, t.address] })],
);

// ── DKG ────────────────────────────────────────────────────────────────────

export const dkgSessions = sqliteTable("dkg_sessions", {
  id: text("id").primaryKey(),
  threshold: integer("threshold").notNull(),
  total: integer("total").notNull(),
  status: text("status", { enum: ["round1", "round2", "complete"] })
    .notNull()
    .default("round1"),
  group_id: text("group_id").references(() => groups.id),
  created_at: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const dkgParticipants = sqliteTable(
  "dkg_participants",
  {
    session_id: text("session_id")
      .notNull()
      .references(() => dkgSessions.id),
    address: text("address").notNull(),
    participant_index: integer("participant_index").notNull(),
  },
  (t) => [primaryKey({ columns: [t.session_id, t.address] })],
);

export const dkgRound1Data = sqliteTable(
  "dkg_round1_data",
  {
    session_id: text("session_id")
      .notNull()
      .references(() => dkgSessions.id),
    participant_index: integer("participant_index").notNull(),
    commitments_json: text("commitments_json").notNull(),
  },
  (t) => [primaryKey({ columns: [t.session_id, t.participant_index] })],
);

export const dkgRound2Shares = sqliteTable(
  "dkg_round2_shares",
  {
    session_id: text("session_id")
      .notNull()
      .references(() => dkgSessions.id),
    sender_index: integer("sender_index").notNull(),
    recipient_index: integer("recipient_index").notNull(),
    R_x: text("R_x"),
    R_y: text("R_y"),
    ciphertext: text("ciphertext").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.session_id, t.sender_index, t.recipient_index] }),
  ],
);

export const dkgEncKeyShares = sqliteTable(
  "dkg_enc_key_shares",
  {
    session_id: text("session_id")
      .notNull()
      .references(() => dkgSessions.id),
    recipient_index: integer("recipient_index").notNull(),
    R_x: text("R_x"),
    R_y: text("R_y"),
    ciphertext: text("ciphertext").notNull(),
  },
  (t) => [primaryKey({ columns: [t.session_id, t.recipient_index] })],
);

// ── FROST signing sessions ─────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  group_id: text("group_id").references(() => groups.id),
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
  created_at: integer("created_at").notNull().default(sql`(unixepoch())`),
});

export const commits = sqliteTable(
  "commits",
  {
    session_id: text("session_id")
      .notNull()
      .references(() => sessions.id),
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
    session_id: text("session_id")
      .notNull()
      .references(() => sessions.id),
    signer_index: integer("signer_index").notNull(),
    z: text("z").notNull(),
  },
  (t) => [primaryKey({ columns: [t.session_id, t.signer_index] })],
);

// ── Inferred types ─────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type DkgSession = typeof dkgSessions.$inferSelect;
export type DkgParticipant = typeof dkgParticipants.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Commit = typeof commits.$inferSelect;
export type Share = typeof shares.$inferSelect;
