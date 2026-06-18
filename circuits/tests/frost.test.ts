import { describe, expect, test } from "bun:test";
import { scalarMulBase } from "../src/babyjubjub.ts";
import {
  computeChallenge,
  frostAggregate,
  frostCommit,
  frostSign,
  frostTrustedSetup,
  schnorrSign,
  schnorrVerify,
} from "../src/frost.ts";
import { poseidonHash } from "../src/poseidon.ts";

describe("Schnorr (single-key)", () => {
  test("sign and verify round-trip", () => {
    const privkey = 0xdeadbeefcafebaben;
    const pubkey = scalarMulBase(privkey);
    const msg = poseidonHash([1n, 2n, 3n]);

    const sig = schnorrSign(privkey, msg);
    expect(schnorrVerify(sig, pubkey, msg)).toBe(true);
  });

  test("wrong message fails verification", () => {
    const privkey = 42n;
    const pubkey = scalarMulBase(privkey);
    const msg = poseidonHash([7n, 8n, 9n]);

    const sig = schnorrSign(privkey, msg);
    expect(schnorrVerify(sig, pubkey, msg + 1n)).toBe(false);
  });

  test("wrong pubkey fails verification", () => {
    const privkey = 42n;
    const pubkey = scalarMulBase(privkey);
    const wrongPubkey = scalarMulBase(43n);
    const msg = poseidonHash([1n]);

    const sig = schnorrSign(privkey, msg);
    expect(schnorrVerify(sig, pubkey, msg)).toBe(true);
    expect(schnorrVerify(sig, wrongPubkey, msg)).toBe(false);
  });
});

describe("FROST 2-of-3", () => {
  const threshold = 2;
  const total = 3;
  const msg = poseidonHash([100n, 200n, 300n]);

  test("all 3 signers produce valid aggregate signature", () => {
    const setup = frostTrustedSetup(threshold, total);
    const { aggregateKey, shares } = setup;

    // Round 1: all 3 commit
    const nonces = shares.map((s) => frostCommit(s.index));
    const commitments = nonces.map((n) => n.commitment);

    // Round 2: all 3 sign
    const signerIndices = [1, 2, 3];
    const sigShares = shares.map((share, i) =>
      frostSign(share, nonces[i]!, commitments, signerIndices, aggregateKey, msg)
    );

    // Aggregate
    const sig = frostAggregate(sigShares, commitments, aggregateKey, msg);

    // Verify off-circuit
    expect(schnorrVerify(sig, aggregateKey, msg)).toBe(true);
  });

  test("threshold-2 subset (signers 1,2) produces valid signature", () => {
    const setup = frostTrustedSetup(threshold, total);
    const { aggregateKey, shares } = setup;

    // Only participants 1 and 2
    const subset = [shares[0]!, shares[1]!];
    const signerIndices = [1, 2];

    const nonces = subset.map((s) => frostCommit(s.index));
    const commitments = nonces.map((n) => n.commitment);

    const sigShares = subset.map((share, i) =>
      frostSign(share, nonces[i]!, commitments, signerIndices, aggregateKey, msg)
    );

    const sig = frostAggregate(sigShares, commitments, aggregateKey, msg);
    expect(schnorrVerify(sig, aggregateKey, msg)).toBe(true);
  });

  test("threshold-2 subset (signers 2,3) produces valid signature", () => {
    const setup = frostTrustedSetup(threshold, total);
    const { aggregateKey, shares } = setup;

    const subset = [shares[1]!, shares[2]!];
    const signerIndices = [2, 3];

    const nonces = subset.map((s) => frostCommit(s.index));
    const commitments = nonces.map((n) => n.commitment);

    const sigShares = subset.map((share, i) =>
      frostSign(share, nonces[i]!, commitments, signerIndices, aggregateKey, msg)
    );

    const sig = frostAggregate(sigShares, commitments, aggregateKey, msg);
    expect(schnorrVerify(sig, aggregateKey, msg)).toBe(true);
  });

  test("wrong msg fails verification", () => {
    const setup = frostTrustedSetup(threshold, total);
    const { aggregateKey, shares } = setup;

    const subset = [shares[0]!, shares[1]!];
    const signerIndices = [1, 2];
    const nonces = subset.map((s) => frostCommit(s.index));
    const commitments = nonces.map((n) => n.commitment);

    const sigShares = subset.map((share, i) =>
      frostSign(share, nonces[i]!, commitments, signerIndices, aggregateKey, msg)
    );
    const sig = frostAggregate(sigShares, commitments, aggregateKey, msg);

    expect(schnorrVerify(sig, aggregateKey, msg)).toBe(true);
    expect(schnorrVerify(sig, aggregateKey, msg + 1n)).toBe(false);
  });

  test("3-of-5 setup works with any threshold subset", () => {
    const setup = frostTrustedSetup(3, 5);
    const { aggregateKey, shares } = setup;

    // Use participants 1, 3, 5
    const subset = [shares[0]!, shares[2]!, shares[4]!];
    const signerIndices = [1, 3, 5];

    const nonces = subset.map((s) => frostCommit(s.index));
    const commitments = nonces.map((n) => n.commitment);

    const sigShares = subset.map((share, i) =>
      frostSign(share, nonces[i]!, commitments, signerIndices, aggregateKey, msg)
    );
    const sig = frostAggregate(sigShares, commitments, aggregateKey, msg);
    expect(schnorrVerify(sig, aggregateKey, msg)).toBe(true);
  });
});
