import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

// @ts-expect-error – circom_tester is a CJS module
import { wasm } from "circom_tester";
import { scalarMulBase } from "../src/babyjubjub.ts";
import { schnorrSign, schnorrVerify } from "../src/frost.ts";
import { buildFullMerkleProof } from "../src/merkle.ts";
import { noteCommitment, noteNullifier } from "../src/note.ts";
import { buildSpendInput, deriveSpendMsg } from "../src/spend-input.ts";

const CIRCUIT_PATH = path.join(__dirname, "circuits", "test_spend.circom");
const LEVELS = 4; // must match test_spend.circom

describe("Spend", () => {
  let circuit: any;

  // Private key representing the 2-of-3 aggregate key in circuit tests.
  // (Full FROST round-trip is covered in frost.test.ts.)
  const privkey = 42n;
  const aggPubkey = scalarMulBase(privkey);

  beforeAll(async () => {
    circuit = await wasm(CIRCUIT_PATH);
  });

  /**
   * Builds a valid witness for a 2-input spend:
   *   note0 (600) + note1 (400)  →  outNote0 (700, recipient) + outNote1 (300, change)
   * Both input notes are inserted into the SAME Merkle tree so their proofs
   * share the same root.
   */
  function buildValidInput(overrides: {
    privkey?: bigint;
    amount0?: bigint;
    amount1?: bigint;
    outAmount0?: bigint;
    outAmount1?: bigint;
    deposit?: bigint;
    withdraw?: bigint;
  } = {}) {
    const pk = overrides.privkey ?? privkey;
    const aggKey = overrides.privkey ? scalarMulBase(pk) : aggPubkey;
    const recipientKey = scalarMulBase(99n);

    const note0 = { pubkey: aggKey, amount: overrides.amount0 ?? 600n, salt: 111n };
    const note1 = { pubkey: aggKey, amount: overrides.amount1 ?? 400n, salt: 222n };
    const outNote0 = { pubkey: recipientKey, amount: overrides.outAmount0 ?? 700n, salt: 333n };
    const outNote1 = { pubkey: aggKey, amount: overrides.outAmount1 ?? 300n, salt: 444n };

    const c0 = noteCommitment(note0);
    const c1 = noteCommitment(note1);

    // Build BOTH proofs from the same tree (indices 0 and 1)
    const proof0 = buildFullMerkleProof(LEVELS, [c0, c1], 0);
    const proof1 = buildFullMerkleProof(LEVELS, [c0, c1], 1);
    // Sanity: same root
    if (proof0.root !== proof1.root) throw new Error("root mismatch in test setup");
    const root = proof0.root;

    const n0 = noteNullifier(c0, 0n);
    const n1 = noteNullifier(c1, 1n);
    const oc0 = noteCommitment(outNote0);
    const oc1 = noteCommitment(outNote1);

    const msg = deriveSpendMsg({
      root,
      nullifiers: [n0, n1],
      outputCommitments: [oc0, oc1],
      publicDepositAmount: overrides.deposit ?? 0n,
      publicWithdrawAmount: overrides.withdraw ?? 0n,
    });

    const sig = schnorrSign(pk, msg);
    expect(schnorrVerify(sig, aggKey, msg)).toBe(true);

    return buildSpendInput({
      inputNotes: [
        { note: note0, index: 0 },
        { note: note1, index: 1 },
      ],
      outputNotes: [outNote0, outNote1],
      merkleTreeLevels: LEVELS,
      publicDepositAmount: overrides.deposit ?? 0n,
      publicWithdrawAmount: overrides.withdraw ?? 0n,
      merkleProofs: [proof0, proof1],
      signature: sig,
    });
  }

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

  test("amount conservation violated (output > input) fails", async () => {
    const input = buildValidInput();
    // Inflate output without touching inputs
    input.output_amounts = [input.output_amounts[0]! + 100n, input.output_amounts[1]!];
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });

  test("wrong path elements (invalid Merkle proof) fails", async () => {
    const input = buildValidInput();
    input.path_elements[0]![0] = 99999999n;
    await expect(circuit.calculateWitness(input)).rejects.toThrow();
  });
});
