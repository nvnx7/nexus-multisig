import { poseidonHash } from "./poseidon";

export type Note = {
  pubkey: { x: bigint, y: bigint };   // FROST aggregate public key of the owning group
  amount: bigint;
  salt: bigint;
};

export function noteCommitment(note: Note): bigint {
  return poseidonHash([note.pubkey.x, note.pubkey.y, note.amount, note.salt]);
}

export function noteNullifier(commitment: bigint, noteIndex: bigint): bigint {
  return poseidonHash([commitment, noteIndex]);
}
