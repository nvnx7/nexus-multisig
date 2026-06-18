/**
 * Shielded wallet derivation.
 *
 * A shielded wallet has two keys derived deterministically from a Stellar
 * wallet signature:
 *
 *   Spend key  — BabyJubJub keypair for creating note commitments and
 *                authorising spends in the ZK circuit.
 *
 *   View key   — X25519 keypair for ECDH-encrypting note data so the
 *                recipient can scan and decrypt outputs intended for them.
 *
 * Both are derived from sha256(sigBytes); the view key uses an additional
 * round so the two never share entropy.  Because derivation is deterministic,
 * re-connecting the same Stellar wallet always yields the same shielded
 * identity.
 */

import { babyjubjub } from "@noble/curves/misc";
import { x25519 } from "@noble/curves/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { poseidon } from "@iden3/js-crypto";

// ── Curve constants (must match circuits/src/babyjubjub.ts) ────────────────

const BASE8_AFFINE = {
  x: 5299619240641551281634865583518297030282874472190772894086521144482721001553n,
  y: 16950150798460657717958625567821834550301663161624707787222815936182638968203n,
};

const ORDER =
  2736030358979909402780800718157159386076813972158567259200215660948447373041n;

// ── Types ──────────────────────────────────────────────────────────────────

export interface ShieldedWallet {
  // ── Spend key (BabyJubJub) ────────────────────────────────────────────
  /** BabyJubJub private scalar (hex, 0x-prefixed, 32 bytes). */
  privateKey: string;
  /** BabyJubJub public key X coordinate (decimal string). */
  pubKeyX: string;
  /** BabyJubJub public key Y coordinate (decimal string). */
  pubKeyY: string;
  /** Poseidon(pubKeyX, pubKeyY) — the on-chain note-key identity. */
  address: string;

  // ── View key (X25519) ─────────────────────────────────────────────────
  /** X25519 private scalar (hex, 0x-prefixed, 32 bytes). */
  viewPrivKey: string;
  /** X25519 public key (hex, 32 bytes) — published via pool.register(). */
  viewPubKey: string;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fixed string passed to StellarWalletsKit.signMessage() to derive the
 * shielded keys.  Never change this — it would invalidate all existing wallets.
 */
export const DERIVATION_MSG = "nexus:v1:derive-shielded-key";

/**
 * Derive the shielded wallet (spend key + view key) from the result of
 * `StellarWalletsKit.signMessage(DERIVATION_MSG)`.
 *
 * @param signedMessage  base64 string returned by the kit.
 */
export function deriveShieldedWallet(signedMessage: string): ShieldedWallet {
  const sigBytes = base64ToBytes(signedMessage);

  // ── Spend key ──────────────────────────────────────────────────────────
  const spendSeed = sha256(sigBytes);
  const privateKeyScalar = mod(BigInt("0x" + bytesToHex(spendSeed)), ORDER);
  const pubPt = babyjubjub.ExtendedPoint.fromAffine(BASE8_AFFINE)
    .multiply(privateKeyScalar)
    .toAffine();
  const address = BigInt(poseidon.hash([pubPt.x, pubPt.y]).toString()).toString();

  // ── View key ───────────────────────────────────────────────────────────
  // Second sha256 round keeps spend and view entropy independent.
  const viewSeed = sha256(spendSeed);
  // X25519 scalar clamping (RFC 7748 §5)
  viewSeed[0] &= 248;
  viewSeed[31] &= 127;
  viewSeed[31] |= 64;
  const viewPubBytes = x25519.getPublicKey(viewSeed);

  return {
    privateKey: "0x" + privateKeyScalar.toString(16).padStart(64, "0"),
    pubKeyX: pubPt.x.toString(),
    pubKeyY: pubPt.y.toString(),
    address,
    viewPrivKey: "0x" + bytesToHex(viewSeed),
    viewPubKey: bytesToHex(viewPubBytes),
  };
}

// ── Utilities ──────────────────────────────────────────────────────────────

function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
