import {
  bytesToHex,
  bytesToNumberBE,
  hexToBytes,
  numberToBytesBE,
  randomBytes,
} from "@noble/curves/utils.js";
import { eciesDecrypt, eciesEncrypt } from "./ecies";
import { poseidonHash } from "./poseidon";
import { BN254_FIELD } from "./constants";
import type { Point } from "./frost/signature";

/** A fresh group view key (gvk): a field element used to encrypt the group's notes. */
export function generateGroupViewKey(): bigint {
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
