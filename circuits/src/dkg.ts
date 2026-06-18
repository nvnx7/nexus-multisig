/**
 * Pedersen Distributed Key Generation (DKG) for BabyJubJub FROST.
 *
 * Follows the same 3-round structure as noble-curves DKG but instantiated on
 * BabyJubJub so the resulting shares are compatible with the custom FROST
 * signing protocol in frost.ts (Poseidon challenge, s = k - e·x convention).
 *
 * The library implements the cryptographic steps only. Authenticated
 * communication, session coordination, and encrypted share transport are
 * handled by the coordinator API.
 */

import { mod, ORDER, type Point, pointAdd, scalarMul, scalarMulBase } from "./babyjubjub.ts";
import type { KeyShare } from "./frost.ts";

function randomScalar(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return mod(BigInt("0x" + Buffer.from(bytes).toString("hex")), ORDER);
}

function evalPoly(coefficients: bigint[], x: number): bigint {
  let result = 0n;
  let xPow = 1n;
  for (const c of coefficients) {
    result = mod(result + c * xPow);
    xPow = mod(xPow * BigInt(x));
  }
  return result;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type DkgRound1Secret = {
  index: number;
  threshold: number;
  coefficients: bigint[]; // a_0 .. a_{t-1}, kept private
};

export type DkgRound1Public = {
  index: number;
  commitments: Point[]; // C_k = a_k·BASE8, broadcast to all participants
};

export type DkgRound2Share = {
  recipientIndex: number;
  value: bigint; // f_i(recipientIndex) — plaintext; encrypt before sending
};

export type DkgKeyPackage = {
  share: KeyShare;       // final key share for FROST signing
  groupPublicKey: Point; // group aggregate key Y = Σ_i C_{i,0}
};

// ── DKG Rounds ───────────────────────────────────────────────────────────────

/**
 * Round 1: generate a random degree-(t-1) polynomial and Pedersen commitments.
 * Broadcast `public` to all participants via the coordinator.
 * Keep `secret` local — never share it.
 */
export function dkgRound1(
  index: number,
  threshold: number
): { secret: DkgRound1Secret; public: DkgRound1Public } {
  const coefficients = Array.from({ length: threshold }, () => randomScalar());
  return {
    secret: { index, threshold, coefficients },
    public: { index, commitments: coefficients.map((c) => scalarMulBase(c)) },
  };
}

/**
 * Round 2: compute a scalar share f_i(j) for every participant j.
 * - Self-share (j === i): store locally, no transport needed.
 * - Other shares (j ≠ i): encrypt to j's BabyJubJub pubkey before sending.
 *
 * Encryption scheme (ECDH on BabyJubJub):
 *   r  = random scalar
 *   R  = r·BASE8            (ephemeral pubkey, sent alongside ciphertext)
 *   K  = Poseidon(r·Pj.x, r·Pj.y)   (shared secret)
 *   ct = value XOR K        (or AES-GCM keyed by K for production)
 */
export function dkgRound2(
  secret: DkgRound1Secret,
  allIndices: number[]
): DkgRound2Share[] {
  return allIndices.map((j) => ({
    recipientIndex: j,
    value: evalPoly(secret.coefficients, j),
  }));
}

/**
 * Round 3: verify received shares against Pedersen commitments, then derive
 * the final key package.
 *
 * @param index           This participant's 1-based index.
 * @param allRound1Public Round 1 public data from ALL n participants.
 * @param receivedShares  Plaintext scalars { senderIndex, value: f_i(index) }
 *                        for every participant i (including self).
 */
export function dkgRound3(
  index: number,
  allRound1Public: DkgRound1Public[],
  receivedShares: { senderIndex: number; value: bigint }[]
): DkgKeyPackage {
  // Verify: f_i(j)·BASE8 == Σ_k C_{i,k}·j^k
  for (const { senderIndex, value } of receivedShares) {
    const r1 = allRound1Public.find((p) => p.index === senderIndex);
    if (!r1) throw new Error(`Missing round1 data for participant ${senderIndex}`);

    let expected: Point | null = null;
    let xPow = 1n;
    for (const commitment of r1.commitments) {
      const term = xPow === 1n ? commitment : scalarMul(xPow, commitment);
      expected = expected === null ? term : pointAdd(expected, term);
      xPow = mod(xPow * BigInt(index));
    }
    if (!expected) throw new Error("Empty commitment list");

    const actual = scalarMulBase(value);
    if (actual.x !== expected.x || actual.y !== expected.y) {
      throw new Error(`Share from participant ${senderIndex} failed Pedersen verification`);
    }
  }

  // x_j = Σ_i f_i(j)  (mod ORDER)
  const secret = mod(receivedShares.reduce((acc, s) => acc + s.value, 0n));

  // Y = Σ_i C_{i,0}
  let groupPublicKey: Point | null = null;
  for (const r1 of allRound1Public) {
    const c0 = r1.commitments[0];
    if (!c0) throw new Error(`Participant ${r1.index} has no commitments`);
    groupPublicKey = groupPublicKey === null ? c0 : pointAdd(groupPublicKey, c0);
  }
  if (!groupPublicKey) throw new Error("No round1 data provided");

  return {
    share: { index, secret, public: scalarMulBase(secret) },
    groupPublicKey,
  };
}
