import { beforeAll, describe, expect, test } from "bun:test";
import path from "node:path";

// @ts-expect-error – circom_tester is a CJS module
import { wasm } from "circom_tester";
import {
  schnorrSign,
  schnorrVerify,
  poseidonHash,
  BASE8,
  ORDER,
  mod,
  frostCommit,
  frostSign,
  frostAggregate,
} from "nexus-crypto";
import { setupDKG, getGroupPublicKey } from "./helper";

const CIRCUIT_PATH = path.join(
  __dirname,
  "circuits",
  "test_schnorr_verify.circom",
);

describe("SchnorrVerify", () => {
  let circuit: any;

  const privkey = 12345678901234567890n;
  const pubPt = BASE8.multiply(mod(privkey, ORDER)).toAffine();
  const pubkey = { x: pubPt.x, y: pubPt.y };
  const msg = poseidonHash([1n, 2n, 3n]); // some message hash

  beforeAll(async () => {
    circuit = await wasm(CIRCUIT_PATH);
  });

  test("valid signature passes", async () => {
    const sig = schnorrSign({ key: privkey, message: msg });

    // Confirm off-circuit verification passes
    expect(schnorrVerify({ signature: sig, pubkey, message: msg })).toBe(true);

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
    const sig = schnorrSign({ key: privkey, message: msg });

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg,
        pubkey: [pubkey.x, pubkey.y],
        s: sig.s,
        e: sig.e + 1n, // corrupt challenge
      }),
    ).rejects.toThrow();
  });

  test("wrong s fails", async () => {
    const sig = schnorrSign({ key: privkey, message: msg });

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg,
        pubkey: [pubkey.x, pubkey.y],
        s: mod(sig.s + 1n, ORDER),
        e: sig.e,
      }),
    ).rejects.toThrow();
  });

  test("wrong pubkey fails", async () => {
    const sig = schnorrSign({ key: privkey, message: msg });
    const otherPt = BASE8.multiply(mod(999n, ORDER)).toAffine();
    const otherPubkey = { x: otherPt.x, y: otherPt.y };

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg,
        pubkey: [otherPubkey.x, otherPubkey.y],
        s: sig.s,
        e: sig.e,
      }),
    ).rejects.toThrow();
  });

  test("wrong msg fails", async () => {
    const sig = schnorrSign({ key: privkey, message: msg });

    await expect(
      circuit.calculateWitness({
        enabled: 1n,
        msg: msg + 1n,
        pubkey: [pubkey.x, pubkey.y],
        s: sig.s,
        e: sig.e,
      }),
    ).rejects.toThrow();
  });

  test("FROST-aggregated signature passes circuit and schnorrVerify", async () => {
    // Full DKG (2-of-3), then explicit FROST commit -> sign -> aggregate.
    const { aliceKey, bobKey } = await setupDKG();
    const groupPubkey = getGroupPublicKey(aliceKey);
    const frostMsg = poseidonHash([123n, 456n]);

    // Round 1: each signer commits to its nonce pair.
    const aliceCommit = frostCommit(aliceKey.secret);
    const bobCommit = frostCommit(bobKey.secret);
    const commitmentList = [aliceCommit.commitments, bobCommit.commitments];

    // Round 2: each signer produces a signature share.
    const aliceShare = frostSign(
      aliceKey.secret,
      aliceKey.public,
      aliceCommit.nonces,
      commitmentList,
      frostMsg,
    );
    const bobShare = frostSign(
      bobKey.secret,
      bobKey.public,
      bobCommit.nonces,
      commitmentList,
      frostMsg,
    );

    // Coordinator aggregates the shares into a single (s, e) signature.
    const sig = frostAggregate(aliceKey.public, commitmentList, frostMsg, [
      aliceShare,
      bobShare,
    ]);

    // Off-circuit verification against the group public key.
    expect(
      schnorrVerify({ signature: sig, pubkey: groupPubkey, message: frostMsg }),
    ).toBe(true);

    // In-circuit verification: the threshold signature must satisfy SchnorrVerify.
    const witness = await circuit.calculateWitness({
      enabled: 1n,
      msg: frostMsg,
      pubkey: [groupPubkey.x, groupPubkey.y],
      s: sig.s,
      e: sig.e,
    });
    await circuit.checkConstraints(witness);
  });

  test("enabled=0 skips verification (any s/e pass for valid pubkey)", async () => {
    const dummyPt = BASE8.multiply(mod(1n, ORDER)).toAffine();
    const dummyPubkey = { x: dummyPt.x, y: dummyPt.y };
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
