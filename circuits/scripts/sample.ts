/**
 * End-to-end sample: FROST 2-of-3 keygen → spend with shielded transfer → verify.
 * Run with: bun scripts/sample.ts
 */

import { scalarMulBase } from "../src/babyjubjub.ts";
import {
  frostAggregate,
  frostCommit,
  frostSign,
  frostTrustedSetup,
  schnorrVerify,
} from "../src/frost.ts";
import { buildFullMerkleProof } from "../src/merkle.ts";
import { noteCommitment, noteNullifier } from "../src/note.ts";
import { buildSpendInput, deriveSpendMsg } from "../src/spend-input.ts";

const LEVELS = 32;

// ── 1. FROST 2-of-3 key setup ────────────────────────────────────────────────
console.log("Setting up FROST 2-of-3...");
const setup = frostTrustedSetup(2, 3);
const { aggregateKey, shares } = setup;
console.log(`  Aggregate pubkey: (${aggregateKey.x}, ${aggregateKey.y})`);

// ── 2. Create two input UTXOs owned by the multisig group ────────────────────
const note0 = { pubkey: aggregateKey, amount: 600n, salt: BigInt(Math.random() * 1e18) };
const note1 = { pubkey: aggregateKey, amount: 400n, salt: BigInt(Math.random() * 1e18) };

const c0 = noteCommitment(note0);
const c1 = noteCommitment(note1);
// Both proofs must come from the same tree (same root).
const proof0 = buildFullMerkleProof(LEVELS, [c0, c1], 0);
const proof1 = buildFullMerkleProof(LEVELS, [c0, c1], 1);
const root = proof0.root; // == proof1.root

console.log(`\nInput notes:`);
console.log(`  note0: amount=${note0.amount}, commitment=${c0}`);
console.log(`  note1: amount=${note1.amount}, commitment=${c1}`);
console.log(`  Merkle root: ${root}`);

// ── 3. Define outputs: shielded transfer to a recipient + change back ─────────
const recipientKey = scalarMulBase(99999n); // recipient has different key
const outNote0 = { pubkey: recipientKey, amount: 700n, salt: BigInt(Math.random() * 1e18) };
const outNote1 = { pubkey: aggregateKey, amount: 300n, salt: BigInt(Math.random() * 1e18) };

const oc0 = noteCommitment(outNote0);
const oc1 = noteCommitment(outNote1);
const n0 = noteNullifier(c0, 0n);
const n1 = noteNullifier(c1, 1n);

console.log(`\nOutput notes:`);
console.log(`  outNote0 (recipient): amount=${outNote0.amount}`);
console.log(`  outNote1 (change):    amount=${outNote1.amount}`);

// ── 4. Derive the message and run FROST signing protocol ─────────────────────
const msg = deriveSpendMsg({
  root,
  nullifiers: [n0, n1],
  outputCommitments: [oc0, oc1],
  publicDepositAmount: 0n,
  publicWithdrawAmount: 0n,
});
console.log(`\nMessage (Poseidon hash of tx): ${msg}`);

// Participants 1 and 2 sign (threshold = 2)
const signerIndices = [1, 2];
const subset = [shares[0]!, shares[1]!];
const nonces = subset.map((s) => frostCommit(s.index));
const commitments = nonces.map((n) => n.commitment);

const sigShares = subset.map((share, i) =>
  frostSign(share, nonces[i]!, commitments, signerIndices, aggregateKey, msg)
);

const sig = frostAggregate(sigShares, commitments, aggregateKey, msg);
console.log(`\nFROST signature:`);
console.log(`  s = ${sig.s}`);
console.log(`  e = ${sig.e}`);

// Verify off-circuit
const valid = schnorrVerify(sig, aggregateKey, msg);
console.log(`\nOff-circuit verification: ${valid ? "PASS ✓" : "FAIL ✗"}`);

// ── 5. Build circuit witness ──────────────────────────────────────────────────
const spendInput = buildSpendInput({
  inputNotes: [
    { note: note0, index: 0 },
    { note: note1, index: 1 },
  ],
  outputNotes: [outNote0, outNote1],
  merkleTreeLevels: LEVELS,
  publicDepositAmount: 0n,
  publicWithdrawAmount: 0n,
  merkleProofs: [proof0, proof1],
  signature: sig,
});

console.log("\nCircuit witness built successfully.");
console.log("Public inputs:");
console.log(`  root:                  ${spendInput.root}`);
console.log(`  nullifiers:            [${spendInput.nullifiers.join(", ")}]`);
console.log(`  output_commitments:    [${spendInput.output_commitments.join(", ")}]`);
console.log(`  agg_pubkey:            [${spendInput.agg_pubkey.join(", ")}]`);
console.log(`  public_deposit_amount: ${spendInput.public_deposit_amount}`);
console.log(`  public_withdraw_amount:${spendInput.public_withdraw_amount}`);
