import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

// @ts-expect-error – circom_tester is a CJS module
import { wasm } from "circom_tester";
import { poseidonHash } from "../src/poseidon.ts";

const CIRCUIT_PATH = path.join(__dirname, "circuits", "test_note_commitment.circom");

describe("NoteCommitment", () => {
  let circuit: any;

  beforeAll(async () => {
    circuit = await wasm(CIRCUIT_PATH);
  });

  test("commitment matches Poseidon(pubkey_x, pubkey_y, amount, salt)", async () => {
    const pubkey_x = 5299619240641551281634865583518297030282874472190772894086521144482721001553n;
    const pubkey_y = 16950150798460657717958625567821834550301663161624707787222815936182638968203n;
    const amount = 1000n;
    const salt = 12345n;

    const expected = poseidonHash([pubkey_x, pubkey_y, amount, salt]);

    const witness = await circuit.calculateWitness({ pubkey_x, pubkey_y, amount, salt });
    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, { commitment: expected });
  });

  test("different salts produce different commitments", async () => {
    const pubkey_x = 1n;
    const pubkey_y = 1n;
    const amount = 500n;

    const c1 = poseidonHash([pubkey_x, pubkey_y, amount, 1n]);
    const c2 = poseidonHash([pubkey_x, pubkey_y, amount, 2n]);
    expect(c1).not.toBe(c2);

    const w1 = await circuit.calculateWitness({ pubkey_x, pubkey_y, amount, salt: 1n });
    const w2 = await circuit.calculateWitness({ pubkey_x, pubkey_y, amount, salt: 2n });
    await circuit.assertOut(w1, { commitment: c1 });
    await circuit.assertOut(w2, { commitment: c2 });
  });

  test("zero amount is a valid note", async () => {
    const input = { pubkey_x: 42n, pubkey_y: 99n, amount: 0n, salt: 7n };
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, {
      commitment: poseidonHash([input.pubkey_x, input.pubkey_y, input.amount, input.salt]),
    });
  });
});
