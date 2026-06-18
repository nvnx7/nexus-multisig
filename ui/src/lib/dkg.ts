/**
 * Browser-compatible Pedersen DKG for BabyJubJub FROST.
 * Mirrors circuits/src/dkg.ts — all crypto must stay in sync.
 */

import { babyjubjub } from "@noble/curves/misc";
import { poseidon } from "@iden3/js-crypto";

const BASE8_AFFINE = {
  x: 5299619240641551281634865583518297030282874472190772894086521144482721001553n,
  y: 16950150798460657717958625567821834550301663161624707787222815936182638968203n,
};

export const ORDER =
  2736030358979909402780800718157159386076813972158567259200215660948447373041n;

export type Point = { x: bigint; y: bigint };

function bjjMod(a: bigint, m: bigint = ORDER): bigint {
  return ((a % m) + m) % m;
}

function pointFromAffine(
  p: ReturnType<typeof babyjubjub.ExtendedPoint.fromAffine>,
): Point {
  const aff = p.toAffine();
  return { x: aff.x, y: aff.y };
}

function scalarMulBase(scalar: bigint): Point {
  return pointFromAffine(
    babyjubjub.ExtendedPoint.fromAffine(BASE8_AFFINE).multiply(scalar),
  );
}

function scalarMul(scalar: bigint, point: Point): Point {
  return pointFromAffine(
    babyjubjub.ExtendedPoint.fromAffine(point).multiply(scalar),
  );
}

function pointAdd(a: Point, b: Point): Point {
  return pointFromAffine(
    babyjubjub.ExtendedPoint.fromAffine(a).add(
      babyjubjub.ExtendedPoint.fromAffine(b),
    ),
  );
}

function randomScalar(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return bjjMod(BigInt("0x" + hex));
}

function evalPoly(coefficients: bigint[], x: number): bigint {
  let result = 0n;
  let xPow = 1n;
  for (const c of coefficients) {
    result = bjjMod(result + c * xPow);
    xPow = bjjMod(xPow * BigInt(x));
  }
  return result;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type DkgRound1Secret = {
  index: number;
  threshold: number;
  coefficients: bigint[];
};

export type DkgRound1Public = {
  index: number;
  commitments: Point[];
};

export type DkgKeyShare = {
  index: number;
  secret: bigint;
  publicKey: Point;
};

export type DkgKeyPackage = {
  share: DkgKeyShare;
  groupPublicKey: Point;
};

// ── Encryption key helpers ──────────────────────────────────────────────────

/**
 * Generate a fresh group encryption key pair.
 * Called by participant 1 during round 2.
 * enc_pk is stored in the group record; enc_sk is distributed encrypted to
 * every participant via dkg_enc_key_shares so any member can decrypt alone.
 */
export function generateEncryptionKey(): { enc_sk: bigint; enc_pk: Point } {
  const enc_sk = randomScalar();
  return { enc_sk, enc_pk: scalarMulBase(enc_sk) };
}

/** Derive enc_pk from enc_sk (e.g. after decryption by a non-index-1 member). */
export function encPkFromSk(enc_sk: bigint): Point {
  return scalarMulBase(enc_sk);
}

// ── Rounds ─────────────────────────────────────────────────────────────────

export function dkgRound1(
  index: number,
  threshold: number,
): { secret: DkgRound1Secret; public: DkgRound1Public } {
  const coefficients = Array.from({ length: threshold }, randomScalar);
  return {
    secret: { index, threshold, coefficients },
    public: { index, commitments: coefficients.map(scalarMulBase) },
  };
}

export function dkgRound2(
  secret: DkgRound1Secret,
  allIndices: number[],
): { recipientIndex: number; value: bigint }[] {
  return allIndices.map((j) => ({
    recipientIndex: j,
    value: evalPoly(secret.coefficients, j),
  }));
}

/**
 * ECDH-encrypt a share value to the recipient's BabyJubJub pubkey.
 * K = Poseidon((r·Pj).x, (r·Pj).y)
 * ct = value XOR K  (stored as 64-char hex)
 */
export function encryptShare(
  value: bigint,
  recipientPubKey: Point,
): { R: Point; ciphertext: string } {
  const r = randomScalar();
  const R = scalarMulBase(r);
  const sharedPt = scalarMul(r, recipientPubKey);
  const K = BigInt(poseidon.hash([sharedPt.x, sharedPt.y]).toString());
  const ct = (value ^ K).toString(16).padStart(64, "0");
  return { R, ciphertext: ct };
}

/**
 * Decrypt a share using the recipient's private key.
 * K = Poseidon((sk·R).x, (sk·R).y)
 */
export function decryptShare(
  ciphertext: string,
  R: Point,
  myPrivateKey: bigint,
): bigint {
  const sharedPt = scalarMul(myPrivateKey, R);
  const K = BigInt(poseidon.hash([sharedPt.x, sharedPt.y]).toString());
  return BigInt("0x" + ciphertext) ^ K;
}

export function dkgRound3(
  index: number,
  allRound1Public: DkgRound1Public[],
  receivedShares: { senderIndex: number; value: bigint }[],
): DkgKeyPackage {
  for (const { senderIndex, value } of receivedShares) {
    const r1 = allRound1Public.find((p) => p.index === senderIndex);
    if (!r1)
      throw new Error(`Missing round1 data for participant ${senderIndex}`);

    let expected: Point | null = null;
    let xPow = 1n;
    for (const commitment of r1.commitments) {
      const term = xPow === 1n ? commitment : scalarMul(xPow, commitment);
      expected = expected === null ? term : pointAdd(expected, term);
      xPow = bjjMod(xPow * BigInt(index));
    }
    if (!expected) throw new Error("Empty commitment list");

    const actual = scalarMulBase(value);
    if (actual.x !== expected.x || actual.y !== expected.y) {
      throw new Error(
        `Share from participant ${senderIndex} failed Pedersen verification`,
      );
    }
  }

  const secret = bjjMod(receivedShares.reduce((acc, s) => acc + s.value, 0n));

  let groupPublicKey: Point | null = null;
  for (const r1 of allRound1Public) {
    const c0 = r1.commitments[0];
    if (!c0) throw new Error(`Participant ${r1.index} has no commitments`);
    groupPublicKey =
      groupPublicKey === null ? c0 : pointAdd(groupPublicKey, c0);
  }
  if (!groupPublicKey) throw new Error("No round1 data provided");

  return {
    share: { index, secret, publicKey: scalarMulBase(secret) },
    groupPublicKey,
  };
}
