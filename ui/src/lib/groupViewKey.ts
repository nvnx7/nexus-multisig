import {
  type Point,
  eciesDecrypt,
  eciesEncrypt,
  poseidonHash,
} from "nexus-crypto";
import {
  bytesToHex,
  bytesToNumberBE,
  hexToBytes,
  numberToBytesBE,
  randomBytes,
} from "@noble/curves/utils.js";
import { BN254_FIELD } from "@/config/constants";

/** A fresh group view key (gvk): a field element used to encrypt the group's notes. */
export function generateGroupViewKey(): bigint {
  // Reduce the 32 random bytes into the Poseidon (BN254) field before hashing.
  return poseidonHash([bytesToNumberBE(randomBytes(32)) % BN254_FIELD]);
}

/** ECIES-encrypt the gvk to a member's personal view public key → hex storage blob. */
export function encryptGvkFor(gvk: bigint, viewPubKey: Point): string {
  return bytesToHex(eciesEncrypt(viewPubKey, numberToBytesBE(gvk, 32)));
}

/** Decrypt a member's gvk blob with their personal view key. */
export function decryptGvk(viewKey: bigint, blob: string): bigint {
  return bytesToNumberBE(eciesDecrypt(viewKey, hexToBytes(blob)));
}

/** 32-byte form of the gvk, used directly as the note-encryption symmetric key. */
export function gvkToKeyBytes(gvk: bigint): Uint8Array {
  return numberToBytesBE(gvk, 32);
}
