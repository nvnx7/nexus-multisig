import { describe, expect, it } from "bun:test";
import { noteCommitment, noteNullifier, poseidonHash, type Note } from "../src/index";

describe("note commitment", () => {
  const note: Note = {
    pubkey: { x: 5n, y: 7n },
    amount: 1000n,
    salt: 12345n,
  };

  it("matches Poseidon(pubkey_x, pubkey_y, amount, salt)", () => {
    expect(noteCommitment(note)).toBe(
      poseidonHash([note.pubkey.x, note.pubkey.y, note.amount, note.salt]),
    );
  });

  it("different salts produce different commitments", () => {
    const c1 = noteCommitment({ ...note, salt: 1n });
    const c2 = noteCommitment({ ...note, salt: 2n });
    expect(c1).not.toBe(c2);
  });
});

describe("note nullifier", () => {
  it("matches Poseidon(commitment, noteIndex)", () => {
    const commitment = poseidonHash([42n, 99n, 1000n, 111n]);
    expect(noteNullifier(commitment, 3n)).toBe(poseidonHash([commitment, 3n]));
  });

  it("same commitment at different indices yields different nullifiers", () => {
    const commitment = poseidonHash([1n, 2n, 3n, 4n]);
    expect(noteNullifier(commitment, 0n)).not.toBe(noteNullifier(commitment, 1n));
  });
});
