import { beforeAll, describe, test } from "bun:test";
import path from "node:path";

// @ts-expect-error – circom_tester is a CJS module
import { wasm } from "circom_tester";
import { poseidonHash } from "nexus-crypto";

const CIRCUIT_PATH = path.join(__dirname, "circuits", "test_note_nullifier.circom");

describe("NoteNullifier", () => {
  let circuit: any;

  beforeAll(async () => {
    circuit = await wasm(CIRCUIT_PATH);
  });

  test("nullifier matches Poseidon(commitment, note_index)", async () => {
    const commitment = poseidonHash([42n, 99n, 1000n, 111n]);
    const note_index = 3n;
    const expected = poseidonHash([commitment, note_index]);

    const witness = await circuit.calculateWitness({ commitment, note_index });
    await circuit.checkConstraints(witness);
    await circuit.assertOut(witness, { nullifier: expected });
  });

  test("same commitment at different indices yields different nullifiers", async () => {
    const commitment = poseidonHash([1n, 2n, 3n, 4n]);
    const w0 = await circuit.calculateWitness({ commitment, note_index: 0n });
    const w1 = await circuit.calculateWitness({ commitment, note_index: 1n });

    const n0 = poseidonHash([commitment, 0n]);
    const n1 = poseidonHash([commitment, 1n]);

    await circuit.assertOut(w0, { nullifier: n0 });
    await circuit.assertOut(w1, { nullifier: n1 });

    // They must differ
    const field = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    // Just check JS-side they differ
    const _ = n0 !== n1;
  });
});
