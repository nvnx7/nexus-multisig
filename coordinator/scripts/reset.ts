#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import { join } from "node:path";
import { rmSync } from "node:fs";

const DB_PATH = join(import.meta.dir, "../coordinator.db");

rmSync(DB_PATH, { force: true });

const db = new Database(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE dkg_sessions (
    id              TEXT PRIMARY KEY,
    threshold       INTEGER NOT NULL,
    creator_address TEXT NOT NULL,
    participants    TEXT NOT NULL,
    round1_data     TEXT NOT NULL DEFAULT '{}',
    round2_data     TEXT NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'round1',
    group_id        TEXT,
    created_at      INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE groups (
    id             TEXT PRIMARY KEY,
    threshold      INTEGER NOT NULL,
    members        TEXT NOT NULL,
    group_pubkey_x TEXT NOT NULL,
    group_pubkey_y TEXT NOT NULL,
    group_address  TEXT NOT NULL,
    enc_pubkey_x   TEXT,
    enc_pubkey_y   TEXT,
    enc_shares     TEXT NOT NULL DEFAULT '{}',
    group_view_key TEXT NOT NULL DEFAULT '{}',
    dkg_session_id TEXT,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE sign_sessions (
    id                TEXT PRIMARY KEY,
    group_address     TEXT NOT NULL,
    proposer          TEXT NOT NULL,
    tx_details        TEXT NOT NULL,
    tx_hash           TEXT NOT NULL,
    threshold         INTEGER NOT NULL,
    nonce_commitments TEXT NOT NULL DEFAULT '{}',
    enc_nonces        TEXT NOT NULL DEFAULT '{}',
    sig_shares        TEXT NOT NULL DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'collecting_commits',
    sig_s             TEXT,
    sig_e             TEXT,
    created_at        INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

db.close();
console.log("Database reset.");
