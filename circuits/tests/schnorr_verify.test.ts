import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

// @ts-expect-error – circom_tester is a CJS module
import { wasm } from "circom_tester";
import { mod, ORDER, scalarMulBase } from "../src/babyjubjub.ts";
import { schnorrSign, schnorrVerify } from "../src/frost.ts";
import { poseidonHash } from "../src/poseidon.ts";

const CIRCUIT_PATH = path.join(__dirname, "circuits", "test_schnorr_verify.circom");

describe("SchnorrVerify", () => {
  let circuit: any;

  const privkey = 12345678901234567890n;
  const pubkey = scalarMulBase(privkey);
  const msg = poseidonHash([1n, 2n, 3n]); // some message hash

  beforeAll(async () => {
    circuit = await wasm(CIRCUIT_PATH);
  });

  test("valid signature passes", async () => {
    const sig = schnorrSign(privkey, msg);

    // Confirm off-circuit verification passes
    expect(schnorrVerify(sig, pubkey, msg)).toBe(true);

    const witness = await circuit.calculateWitness({
      enabled: 1n,
      msg,
      pubkey: [pubkey.x, pubkey.y],
      s: sig.s,
      e: sig.e,
    });
    await circuit.checkConstraints(witness);
  });

  test("wrong e fails", async () => {
    const sig = schnorrSign(privkey, msg);

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg,
        pubkey: [pubkey.x, pubkey.y],
        s: sig.s,
        e: sig.e + 1n, // corrupt challenge
      })
    ).rejects.toThrow();
  });

  test("wrong s fails", async () => {
    const sig = schnorrSign(privkey, msg);

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg,
        pubkey: [pubkey.x, pubkey.y],
        s: mod(sig.s + 1n, ORDER),
        e: sig.e,
      })
    ).rejects.toThrow();
  });

  test("wrong pubkey fails", async () => {
    const sig = schnorrSign(privkey, msg);
    const otherPubkey = scalarMulBase(999n);

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg,
        pubkey: [otherPubkey.x, otherPubkey.y],
        s: sig.s,
        e: sig.e,
      })
    ).rejects.toThrow();
  });

  test("wrong msg fails", async () => {
    const sig = schnorrSign(privkey, msg);

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg: msg + 1n,
        pubkey: [pubkey.x, pubkey.y],
        s: sig.s,
        e: sig.e,
      })
    ).rejects.toThrow();
  });

  test("enabled=0 skips verification (any s/e pass for valid pubkey)", async () => {
    // pubkey must be a valid curve point even when disabled (EscalarMulAny enforces it);
    // only the equality check e==e' is skipped.
    const dummyPubkey = scalarMulBase(1n);
    const witness = await circuit.calculateWitness({
      enabled: 0n,
      msg: 9999n,
      pubkey: [dummyPubkey.x, dummyPubkey.y],
      s: 1n,
      e: 9999n, // garbage challenge — would fail if enabled=1
    });
    await circuit.checkConstraints(witness);
  });
});
