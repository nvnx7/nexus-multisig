import {
  BASE8,
  ORDER,
  mod,
  schnorrSign,
  schnorrVerify,
  type SchnorrSignature,
  buildFullMerkleProof,
  noteCommitment,
  noteNullifier,
  type Point,
} from "nexus-crypto";
import { buildTransactInput, deriveTransactMsg, ZERO_LEAF } from "../../src/transact-input.ts";

/** Merkle tree depth; must match test_transact.circom. */
export const LEVELS = 4;

// Stand-in for keccak256(xdr(ext_data)) mod field — the circuit only needs a
// field element; the on-chain contract enforces it matches the real ext_data.
export const EXT_DATA_HASH = 123456789n;

// BN254 scalar field prime (the circom field). Withdrawals are encoded as a
// field-negative public amount, matching what the pool contract derives on-chain.
const SNARK_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Net public amount: deposits positive, withdrawals field-negative. */
export function publicAmountOf(deposit: bigint, withdraw: bigint): bigint {
  return ((deposit - withdraw) % SNARK_FIELD + SNARK_FIELD) % SNARK_FIELD;
}

// Default single-key signer used when no FROST signer is supplied.
const DEFAULT_PRIVKEY = 42n;

/**
 * Builds a valid witness for a 2-input spend:
 *   note0 (600) + note1 (400)  →  outNote0 (700, recipient) + outNote1 (300, change)
 * Both input notes are inserted into the SAME Merkle tree so their proofs
 * share the same root.
 *
 * By default it signs with a raw private key. Pass `aggKey` + `sign` to drive it
 * with a real FROST threshold signature instead (see transact.test.ts).
 */
export function buildValidInput(overrides: {
  privkey?: bigint;
  aggKey?: Point;
  sign?: (msg: bigint) => SchnorrSignature;
  amount0?: bigint;
  amount1?: bigint;
  outAmount0?: bigint;
  outAmount1?: bigint;
  deposit?: bigint;
  withdraw?: bigint;
} = {}) {
  const privkey = overrides.privkey ?? DEFAULT_PRIVKEY;
  const derivedPt = BASE8.multiply(mod(privkey, ORDER)).toAffine();
  const aggKey: Point = overrides.aggKey ?? { x: derivedPt.x, y: derivedPt.y };
  const sign =
    overrides.sign ?? ((msg: bigint) => schnorrSign({ key: privkey, message: msg }));

  const recPt = BASE8.multiply(mod(99n, ORDER)).toAffine();
  const recipientKey = { x: recPt.x, y: recPt.y };

  const note0 = { pubkey: aggKey, amount: overrides.amount0 ?? 600n, salt: 111n };
  const note1 = { pubkey: aggKey, amount: overrides.amount1 ?? 400n, salt: 222n };
  const outNote0 = { pubkey: recipientKey, amount: overrides.outAmount0 ?? 700n, salt: 333n };
  const outNote1 = { pubkey: aggKey, amount: overrides.outAmount1 ?? 300n, salt: 444n };

  const c0 = noteCommitment(note0);
  const c1 = noteCommitment(note1);

  // Build BOTH proofs from the same tree (indices 0 and 1)
  const proof0 = buildFullMerkleProof(LEVELS, [c0, c1], 0, ZERO_LEAF);
  const proof1 = buildFullMerkleProof(LEVELS, [c0, c1], 1, ZERO_LEAF);
  // Sanity: same root
  if (proof0.root !== proof1.root) throw new Error("root mismatch in test setup");

  const n0 = noteNullifier(c0, 0n);
  const n1 = noteNullifier(c1, 1n);
  const oc0 = noteCommitment(outNote0);
  const oc1 = noteCommitment(outNote1);

  const publicAmount = publicAmountOf(
    overrides.deposit ?? 0n,
    overrides.withdraw ?? 0n,
  );

  const msg = deriveTransactMsg({
    root: proof0.root,
    nullifiers: [n0, n1],
    outputCommitments: [oc0, oc1],
    publicAmount,
    extDataHash: EXT_DATA_HASH,
  });

  const sig = sign(msg);
  if (!schnorrVerify({ signature: sig, pubkey: aggKey, message: msg }))
    throw new Error("buildValidInput: signature failed to verify");

  return buildTransactInput({
    inputNotes: [
      { note: note0, index: 0 },
      { note: note1, index: 1 },
    ],
    outputNotes: [outNote0, outNote1],
    merkleTreeLevels: LEVELS,
    publicAmount,
    extDataHash: EXT_DATA_HASH,
    merkleProofs: [proof0, proof1],
    signature: sig,
  });
}
