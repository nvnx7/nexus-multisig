CREATE TABLE IF NOT EXISTS `users` (
  `address`    TEXT    PRIMARY KEY NOT NULL,
  `pubkey_x`   TEXT    NOT NULL,
  `pubkey_y`   TEXT    NOT NULL,
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `groups` (
  `id`           TEXT    PRIMARY KEY NOT NULL,
  `threshold`    INTEGER NOT NULL,
  `total`        INTEGER NOT NULL,
  `agg_pubkey_x` TEXT    NOT NULL,
  `agg_pubkey_y` TEXT    NOT NULL,
  `agg_address`  TEXT    NOT NULL,
  `enc_pubkey_x` TEXT,
  `enc_pubkey_y` TEXT,
  `status`       TEXT    NOT NULL DEFAULT 'pending',
  `created_at`   INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `group_members` (
  `group_id`  TEXT NOT NULL REFERENCES `groups`(`id`),
  `address`   TEXT NOT NULL,
  `pubkey_x`  TEXT NOT NULL,
  `pubkey_y`  TEXT NOT NULL,
  PRIMARY KEY (`group_id`, `address`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `encrypted_shares` (
  `group_id`   TEXT NOT NULL REFERENCES `groups`(`id`),
  `address`    TEXT NOT NULL,
  `R_x`        TEXT NOT NULL,
  `R_y`        TEXT NOT NULL,
  `ciphertext` TEXT NOT NULL,
  PRIMARY KEY (`group_id`, `address`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dkg_sessions` (
  `id`         TEXT    PRIMARY KEY NOT NULL,
  `threshold`  INTEGER NOT NULL,
  `total`      INTEGER NOT NULL,
  `status`     TEXT    NOT NULL DEFAULT 'round1',
  `group_id`   TEXT    REFERENCES `groups`(`id`),
  `created_at` INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dkg_participants` (
  `session_id`        TEXT    NOT NULL REFERENCES `dkg_sessions`(`id`),
  `address`           TEXT    NOT NULL,
  `participant_index` INTEGER NOT NULL,
  PRIMARY KEY (`session_id`, `address`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dkg_round1_data` (
  `session_id`        TEXT NOT NULL REFERENCES `dkg_sessions`(`id`),
  `participant_index` INTEGER NOT NULL,
  `commitments_json`  TEXT NOT NULL,
  PRIMARY KEY (`session_id`, `participant_index`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dkg_round2_shares` (
  `session_id`      TEXT    NOT NULL REFERENCES `dkg_sessions`(`id`),
  `sender_index`    INTEGER NOT NULL,
  `recipient_index` INTEGER NOT NULL,
  `R_x`             TEXT,
  `R_y`             TEXT,
  `ciphertext`      TEXT    NOT NULL,
  PRIMARY KEY (`session_id`, `sender_index`, `recipient_index`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `dkg_enc_key_shares` (
  `session_id`      TEXT    NOT NULL REFERENCES `dkg_sessions`(`id`),
  `recipient_index` INTEGER NOT NULL,
  `R_x`             TEXT,
  `R_y`             TEXT,
  `ciphertext`      TEXT    NOT NULL,
  PRIMARY KEY (`session_id`, `recipient_index`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `sessions` (
  `id`           TEXT    PRIMARY KEY NOT NULL,
  `group_id`     TEXT    REFERENCES `groups`(`id`),
  `threshold`    INTEGER NOT NULL,
  `total`        INTEGER NOT NULL,
  `msg`          TEXT    NOT NULL,
  `agg_pubkey_x` TEXT    NOT NULL,
  `agg_pubkey_y` TEXT    NOT NULL,
  `agg_address`  TEXT,
  `status`       TEXT    NOT NULL DEFAULT 'collecting_commits',
  `sig_s`        TEXT,
  `sig_e`        TEXT,
  `created_at`   INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `commits` (
  `session_id`   TEXT    NOT NULL REFERENCES `sessions`(`id`),
  `signer_index` INTEGER NOT NULL,
  `D_x`          TEXT    NOT NULL,
  `D_y`          TEXT    NOT NULL,
  `E_x`          TEXT    NOT NULL,
  `E_y`          TEXT    NOT NULL,
  PRIMARY KEY (`session_id`, `signer_index`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `shares` (
  `session_id`   TEXT    NOT NULL REFERENCES `sessions`(`id`),
  `signer_index` INTEGER NOT NULL,
  `z`            TEXT    NOT NULL,
  PRIMARY KEY (`session_id`, `signer_index`)
);
