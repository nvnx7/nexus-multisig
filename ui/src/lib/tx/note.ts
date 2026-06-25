import {
  type Point,
  eciesDecrypt,
  eciesEncrypt,
  poseidonHash,
} from "nexus-crypto";
import {
  bytesToHex,
  bytesToNumberBE,
  concatBytes,
  hexToBytes,
  numberToBytesBE,
  randomBytes,
} from "@noble/curves/utils.js";

/** A shielded note owned by a group (pubkey = the group's spend public key). */
export type Note = {
  pubkey: Point;
  amount: bigint;
  salt: bigint;
};

const AMOUNT_BYTES = 31;
const SALT_BYTES = 24;

export function randomSalt(): bigint {
  return bytesToNumberBE(randomBytes(SALT_BYTES));
}

/** Poseidon(pubkey.x, pubkey.y, amount, salt) — matches the circuit's NoteCommitment. */
export function noteCommitment(note: Note): bigint {
  return poseidonHash([note.pubkey.x, note.pubkey.y, note.amount, note.salt]);
}

/** Poseidon(commitment, note_index) — matches the circuit's NoteNullifier. */
export function noteNullifier(commitment: bigint, index: bigint): bigint {
  return poseidonHash([commitment, index]);
}

/** ECIES-encrypt a note's secret fields (amount || salt) to the owner group's view key. */
export function encryptNote(note: Note, groupViewPublicKey: Point): string {
  const plaintext = concatBytes(
    numberToBytesBE(note.amount, AMOUNT_BYTES),
    numberToBytesBE(note.salt, SALT_BYTES),
  );
  return bytesToHex(eciesEncrypt(groupViewPublicKey, plaintext));
}

/**
 * Decrypt a note with the group view key (gvk). Returns null if the ciphertext
 * isn't ours. The owner pubkey is supplied by the caller (the scanning group).
 */
export function decryptNote(
  blob: string,
  gvk: bigint,
  ownerPubkey: Point,
): Note | null {
  try {
    const pt = eciesDecrypt(gvk, hexToBytes(blob));
    if (pt.length !== AMOUNT_BYTES + SALT_BYTES) return null;
    return {
      pubkey: ownerPubkey,
      amount: bytesToNumberBE(pt.slice(0, AMOUNT_BYTES)),
      salt: bytesToNumberBE(pt.slice(AMOUNT_BYTES)),
    };
  } catch {
    return null;
  }
}
