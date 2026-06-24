import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

// @ts-expect-error – circom_tester is a CJS module
import { wasm } from "circom_tester";
import {
  setupDKG,
  signTransactWithDKG,
  getGroupPublicKey,
  buildValidInput,
} from "./helper";

const CIRCUIT_PATH = path.join(__dirname, "circuits", "test_transact.circom");

describe("Transact", () => {
  let circuit: any;

  beforeAll(async () => {
    circuit = await wasm(CIRCUIT_PATH);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  test("valid spend with shielded transfer passes all constraints", async () => {
    const input = buildValidInput();
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
  });

  test("public deposit correctly widens the input side", async () => {
    // Inputs: 300 + 200 = 500; deposit 100 public; outputs: 500 + 100 = 600
    const input = buildValidInput({
      amount0: 300n,
      amount1: 200n,
      outAmount0: 500n,
      outAmount1: 100n,
      deposit: 100n,
      withdraw: 0n,
    });
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
  });

  test("public withdrawal correctly widens the output side", async () => {
    // Inputs: 600 + 400 = 1000; withdraw 200 public; outputs: 600 + 200 = 800
    const input = buildValidInput({
      outAmount0: 600n,
      outAmount1: 200n,
      withdraw: 200n,
    });
    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
  });

  // ── Failure cases ──────────────────────────────────────────────────────────

  test("wrong nullifier for first input fails", async () => {
    const input = buildValidInput();
    input.nullifiers = [input.nullifiers[0]! + 1n, input.nullifiers[1]!];
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("wrong nullifier for second input fails", async () => {
    const input = buildValidInput();
    input.nullifiers = [input.nullifiers[0]!, input.nullifiers[1]! + 1n];
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("wrong Merkle root fails", async () => {
    const input = buildValidInput();
    input.root = 12345678n;
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("tampered first output commitment fails", async () => {
    const input = buildValidInput();
    input.output_commitments = [
      input.output_commitments[0]! + 1n,
      input.output_commitments[1]!,
    ];
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("invalid signature (corrupt e) fails", async () => {
    const input = buildValidInput();
    input.sig_e = input.sig_e + 1n;
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("tampered ext_data_hash fails (signature binds it)", async () => {
    const input = buildValidInput();
    input.ext_data_hash = input.ext_data_hash + 1n;
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("amount conservation violated (output > input) fails", async () => {
    const input = buildValidInput();
    // Inflate output without touching inputs
    input.output_amounts = [
      input.output_amounts[0]! + 100n,
      input.output_amounts[1]!,
    ];
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("wrong path elements (invalid Merkle proof) fails", async () => {
    const input = buildValidInput();
    input.path_elements[0]![0] = 99999999n;
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("transact circuit works with real DKG and FROST signature", async () => {
    // Real 2-of-3 DKG, then drive the shared input builder with a FROST signer.
    const { aliceKey, bobKey } = await setupDKG();
    const input = buildValidInput({
      aggKey: getGroupPublicKey(aliceKey),
      sign: (msg) => signTransactWithDKG(msg, aliceKey, bobKey),
    });

    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);
  });
});
