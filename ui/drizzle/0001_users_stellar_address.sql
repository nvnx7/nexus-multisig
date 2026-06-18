-- address column now stores the Stellar G… address (was: Poseidon hash).
-- enc_key stores the X25519 view-key public key (32 bytes hex).
ALTER TABLE `users` ADD `enc_key` TEXT NOT NULL DEFAULT '';
