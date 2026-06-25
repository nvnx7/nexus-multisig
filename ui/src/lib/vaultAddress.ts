import { babyjubjub } from "@noble/curves/misc.js";
import {
  bytesToHex,
  concatBytes,
  hexToBytes,
} from "@noble/curves/utils.js";
import { type Point, BASE8, ORDER, mod } from "nexus-crypto";

/**
 * A vault's shareable address is 64 bytes (128 hex):
 *   compress(groupSpendPublicKey)(32) || compress(groupViewPublicKey)(32)
 * The first half identifies note ownership (FROST aggregate key), the second is
 * the group's encryption key. It travels with the copied string — published nowhere.
 */

const POINT_BYTES = 32;

/** The group's view public key = BASE8·gvk (the encryption key half of the address). */
export function deriveGroupViewPublicKey(gvk: bigint): Point {
  const p = BASE8.multiply(mod(gvk, ORDER));
  return { x: p.x, y: p.y };
}

export function composeVaultAddress(
  groupSpendPublicKey: Point,
  groupViewPublicKey: Point,
): string {
  return bytesToHex(
    concatBytes(
      babyjubjub.Point.fromAffine(groupSpendPublicKey).toBytes(),
      babyjubjub.Point.fromAffine(groupViewPublicKey).toBytes(),
    ),
  );
}

export function parseVaultAddress(hex: string): {
  groupSpendPublicKey: Point;
  groupViewPublicKey: Point;
} {
  const bytes = hexToBytes(hex.startsWith("0x") ? hex.slice(2) : hex);
  if (bytes.length !== 2 * POINT_BYTES)
    throw new Error("vault address must be 64 bytes (compressed spend || view key)");
  const spend = babyjubjub.Point.fromBytes(bytes.slice(0, POINT_BYTES)).toAffine();
  const view = babyjubjub.Point.fromBytes(bytes.slice(POINT_BYTES)).toAffine();
  return {
    groupSpendPublicKey: { x: spend.x, y: spend.y },
    groupViewPublicKey: { x: view.x, y: view.y },
  };
}
