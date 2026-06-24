#!/usr/bin/env bun
/**
 * Set up 10 funded local-network test accounts using the conventional
 * cryptography protocol participant names. Safe to re-run — existing keys are
 * always (re-)funded via friendbot, which is useful after a local ledger reset
 * that wipes on-chain balances while leaving keypairs in the keystore.
 *
 * Usage:
 *   bun contracts/scripts/setup-accounts.ts            # targets local network
 *   bun contracts/scripts/setup-accounts.ts testnet    # targets testnet
 *   (or: cd contracts && bun run setup-accounts [network])
 */

import { $ } from "bun";

// ── Config ────────────────────────────────────────────────────────────────────

const NETWORK = process.argv[2] ?? "local";

const ACCOUNTS = [
  "alice",
  "bob",
  "carol",
  "dave",
  "eve",
  "frank",
  "grace",
  "heidi",
  "ivan",
  "judy",
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the public key for a named identity, or null if it doesn't exist. */
async function getAddress(name: string): Promise<string | null> {
  const result = await $`stellar keys address ${name}`.quiet().nothrow();
  return result.exitCode === 0 ? result.stdout.toString().trim() : null;
}

/** Generates a new keypair and funds it in one step. */
async function generateAndFund(name: string): Promise<void> {
  await $`stellar keys generate ${name} --network ${NETWORK} --fund`;
}

/**
 * Funds an existing keypair via friendbot.
 * Always runs — safe to call on an already-funded account (friendbot idempotency
 * is not relied upon; we ignore non-zero exit codes gracefully).
 */
async function fund(name: string): Promise<void> {
  await $`stellar keys fund ${name} --network ${NETWORK}`.quiet().nothrow();
}

/** Returns the secret key for a named identity. */
async function getSecret(name: string): Promise<string> {
  return (await $`stellar keys secret ${name}`.text()).trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`Network : ${NETWORK}`);
console.log(`Accounts: ${ACCOUNTS.join(" ")}`);
console.log("");

for (const name of ACCOUNTS) {
  const existing = await getAddress(name);

  if (existing) {
    // Key already in keystore — always re-fund (handles ledger resets).
    await fund(name);
    console.log(`  funded ${name.padEnd(8)} ${existing}`);
  } else {
    // New key — generate + fund in one CLI call.
    await generateAndFund(name);
    const address = await getAddress(name);
    console.log(`  added  ${name.padEnd(8)} ${address}`);
  }
}

console.log("");
console.log("Done. All accounts:");
console.log(
  `  ${"NAME".padEnd(8)}  ${"PUBLIC KEY".padEnd(58)}  SECRET KEY`,
);
console.log(
  `  ${"-".repeat(8)}  ${"-".repeat(58)}  ${"-".repeat(70)}`,
);

for (const name of ACCOUNTS) {
  const address = await getAddress(name);
  const secret = await getSecret(name);
  console.log(`  ${name.padEnd(8)}  ${address!.padEnd(58)}  ${secret}`);
}
