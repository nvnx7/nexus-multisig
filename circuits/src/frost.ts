/**
 * FROST threshold Schnorr signatures on BabyJubJub with a Poseidon challenge.
 *
 * This is a custom FROST instantiation designed to be ZK-verifiable inside
 * a circom circuit.  The only deviation from RFC 9591 is the challenge hash:
 *
 *   e = Poseidon(R_x, R_y, agg_pubkey_x, agg_pubkey_y, msg)
 *
 * Everything else (binding factor, nonce derivation, Lagrange interpolation)
 * is standard FROST.  Binding factors use SHA-256 and never appear in the
 * circuit, so they can be any collision-resistant hash.
 *
 * Signing convention (matches schnorr_verify.circom):
 *   e = Poseidon(k·G_x, k·G_y, Y_x, Y_y, msg)
 *   s = k - e·privkey  (mod ORDER)
 *   Verify: R' = s·G + e·Y,  Poseidon(R'_x, R'_y, Y_x, Y_y, msg) == e
 */

import { sha256 } from "@noble/hashes/sha256";
import { mod, ORDER, Point, pointAdd, scalarMul, scalarMulBase } from "./babyjubjub.ts";
import { poseidonHash } from "./poseidon.ts";

// ── Types ────────────────────────────────────────────────────────────────────

export type KeyShare = {
  index: number;         // participant index (1-based)
  secret: bigint;        // xi — secret share
  public: Point;         // Xi = xi·G
};

export type FrostSetup = {
  threshold: number;
  total: number;
  aggregateKey: Point;   // Y = f(0)·G
  shares: KeyShare[];
};

export type NonceCommitment = {
  index: number;
  D: Point;              // di·G
  E: Point;              // ei·G
};

export type Nonces = {
  d: bigint;
  e: bigint;
  commitment: NonceCommitment;
};

export type SignatureShare = {
  index: number;
  z: bigint;             // zi = di + rho_i*ei - lambda_i*e*xi
};

export type FrostSignature = {
  s: bigint;             // aggregate response
  e: bigint;             // challenge
};

// ── Utilities ────────────────────────────────────────────────────────────────

function randomScalar(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return mod(BigInt("0x" + Buffer.from(bytes).toString("hex")), ORDER);
}

function bigintToBytes32(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, "0");
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

/** Binding factor rho_i = H(i || msg || commitments_bytes) using SHA-256. */
function bindingFactor(
  index: number,
  msg: bigint,
  commitments: NonceCommitment[]
): bigint {
  const h = sha256.create();
  h.update(bigintToBytes32(BigInt(index)));
  h.update(bigintToBytes32(msg));
  for (const c of commitments) {
    h.update(bigintToBytes32(BigInt(c.index)));
    h.update(bigintToBytes32(c.D.x));
    h.update(bigintToBytes32(c.D.y));
    h.update(bigintToBytes32(c.E.x));
    h.update(bigintToBytes32(c.E.y));
  }
  return mod(BigInt("0x" + Buffer.from(h.digest()).toString("hex")), ORDER);
}

/** Lagrange coefficient for participant `index` over the set `indices` at x=0. */
function lagrange(index: number, indices: number[]): bigint {
  let num = 1n;
  let den = 1n;
  for (const j of indices) {
    if (j === index) continue;
    num = mod(num * BigInt(-j), ORDER);
    den = mod(den * BigInt(index - j), ORDER);
  }
  // Modular inverse via Fermat's little theorem (ORDER is prime)
  return mod(num * modPow(den, ORDER - 2n, ORDER), ORDER);
}

function modPow(base: bigint, exp: bigint, mod_: bigint): bigint {
  let result = 1n;
  base = ((base % mod_) + mod_) % mod_;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod_;
    base = (base * base) % mod_;
    exp >>= 1n;
  }
  return result;
}

// ── FROST Protocol ───────────────────────────────────────────────────────────

/**
 * Trusted-dealer key generation.
 * The dealer samples a random polynomial of degree (threshold-1) and distributes
 * secret shares to `total` participants.  In production, replace with a
 * distributed DKG (e.g. Pedersen DKG).
 */
export function frostTrustedSetup(threshold: number, total: number): FrostSetup {
  if (threshold > total) throw new Error("threshold > total");

  // Random polynomial coefficients: f(x) = a0 + a1*x + ... + a_{t-1}*x^{t-1}
  const coeffs: bigint[] = [];
  for (let i = 0; i < threshold; i++) {
    coeffs.push(randomScalar());
  }

  const a0 = coeffs[0]!;
  const aggregateKey = scalarMulBase(a0);

  const shares: KeyShare[] = [];
  for (let i = 1; i <= total; i++) {
    let xi = 0n;
    let xPow = 1n;
    for (const c of coeffs) {
      xi = mod(xi + c * xPow, ORDER);
      xPow = mod(xPow * BigInt(i), ORDER);
    }
    shares.push({ index: i, secret: xi, public: scalarMulBase(xi) });
  }

  return { threshold, total, aggregateKey, shares };
}

/**
 * Round 1: each participant generates a nonce pair and returns a commitment.
 * The nonces must be kept secret and discarded after signing.
 */
export function frostCommit(index: number): Nonces {
  const d = randomScalar();
  const e = randomScalar();
  return {
    d,
    e,
    commitment: {
      index,
      D: scalarMulBase(d),
      E: scalarMulBase(e),
    },
  };
}

/**
 * Derives the aggregate nonce R and challenge e from the collected commitments.
 * Used by both signers (round 2) and the aggregator.
 */
export function computeChallenge(
  commitments: NonceCommitment[],
  aggregateKey: Point,
  msg: bigint
): { R: Point; e: bigint } {
  // R = Σ_i (Di + rho_i·Ei)
  let R: Point | null = null;
  for (const c of commitments) {
    const rho = bindingFactor(c.index, msg, commitments);
    const contrib = pointAdd(c.D, scalarMul(rho, c.E));
    R = R === null ? contrib : pointAdd(R, contrib);
  }
  if (!R) throw new Error("no commitments");

  // e = Poseidon(R_x, R_y, Y_x, Y_y, msg)
  const e = poseidonHash([R.x, R.y, aggregateKey.x, aggregateKey.y, msg]);
  return { R, e };
}

/**
 * Round 2: each participant computes their signature share.
 *
 * @param share        The participant's key share.
 * @param nonces       The nonces from round 1.
 * @param commitments  All collected round-1 commitments (from coordinator).
 * @param signerIndices  Indices of the threshold-many participants signing.
 * @param aggregateKey  The FROST aggregate public key.
 * @param msg          The message to sign (field element).
 */
export function frostSign(
  share: KeyShare,
  nonces: Nonces,
  commitments: NonceCommitment[],
  signerIndices: number[],
  aggregateKey: Point,
  msg: bigint
): SignatureShare {
  const { e } = computeChallenge(commitments, aggregateKey, msg);
  const rho = bindingFactor(share.index, msg, commitments);
  const lambda = lagrange(share.index, signerIndices);

  // zi = di + rho_i·ei - lambda_i·e·xi  (mod ORDER)
  const z = mod(
    nonces.d + mod(rho * nonces.e, ORDER) - mod(lambda * mod(e * share.secret, ORDER), ORDER),
    ORDER
  );
  return { index: share.index, z };
}

/**
 * Aggregates signature shares into a final FROST signature (s, e).
 * The coordinator calls this after collecting all round-2 shares.
 */
export function frostAggregate(
  shares: SignatureShare[],
  commitments: NonceCommitment[],
  aggregateKey: Point,
  msg: bigint
): FrostSignature {
  const { e } = computeChallenge(commitments, aggregateKey, msg);
  // s = Σ zi  (mod ORDER)
  const s = mod(
    shares.reduce((acc, sh) => acc + sh.z, 0n),
    ORDER
  );
  return { s, e };
}

// ── Standalone Schnorr (single-key, for testing) ─────────────────────────────

/**
 * Single-key Schnorr sign using the same convention as the circuit.
 * Useful for unit-testing the SchnorrVerify circuit without running full FROST.
 */
export function schnorrSign(privkey: bigint, msg: bigint): FrostSignature {
  const pubkey = scalarMulBase(privkey);
  const k = randomScalar();
  const R = scalarMulBase(k);
  const e = poseidonHash([R.x, R.y, pubkey.x, pubkey.y, msg]);
  const s = mod(k - mod(e * privkey, ORDER), ORDER);
  return { s, e };
}

/** Verify a Schnorr/FROST signature off-circuit. */
export function schnorrVerify(
  sig: FrostSignature,
  pubkey: Point,
  msg: bigint
): boolean {
  const sG = scalarMulBase(sig.s);
  const eP = scalarMul(sig.e, pubkey);
  const R = pointAdd(sG, eP);
  const ePrime = poseidonHash([R.x, R.y, pubkey.x, pubkey.y, msg]);
  return ePrime === sig.e;
}
