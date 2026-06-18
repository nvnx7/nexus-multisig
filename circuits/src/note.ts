import { Point } from "./babyjubjub.ts";
import { poseidonHash } from "./poseidon.ts";

export type Note = {
  pubkey: Point;   // FROST aggregate public key of the owning group
  amount: bigint;
  salt: bigint;
};

export function noteCommitment(note: Note): bigint {
  return poseidonHash([note.pubkey.x, note.pubkey.y, note.amount, note.salt]);
}

export function noteNullifier(commitment: bigint, noteIndex: bigint): bigint {
  return poseidonHash([commitment, noteIndex]);
}
