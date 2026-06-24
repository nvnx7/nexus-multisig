import { describe, expect, it } from "bun:test";
import {
  buildFullMerkleProof,
  buildSparseMerkleProof,
  poseidonHash,
} from "../src/index";

const LEVELS = 4;
// Canonical empty-leaf value: Poseidon("XLM") = Poseidon(88, 76, 77).
const ZERO = poseidonHash([88n, 76n, 77n]);

describe("merkle proofs", () => {
  it("two leaves in one tree share the same root", () => {
    const leaves = [poseidonHash([1n]), poseidonHash([2n])];
    const p0 = buildFullMerkleProof(LEVELS, leaves, 0, ZERO);
    const p1 = buildFullMerkleProof(LEVELS, leaves, 1, ZERO);
    expect(p0.root).toBe(p1.root);
    expect(p0.pathElements).toHaveLength(LEVELS);
    expect(p0.pathIndices).toHaveLength(LEVELS);
  });

  it("sparse proof for a single leaf matches the full proof", () => {
    const leaf = poseidonHash([42n]);
    const sparse = buildSparseMerkleProof(LEVELS, leaf, 0, ZERO);
    const full = buildFullMerkleProof(LEVELS, [leaf], 0, ZERO);
    expect(sparse.root).toBe(full.root);
  });

  it("the same leaf at different indices gives different roots", () => {
    const leaf = poseidonHash([7n]);
    const at0 = buildSparseMerkleProof(LEVELS, leaf, 0, ZERO);
    const at1 = buildSparseMerkleProof(LEVELS, leaf, 1, ZERO);
    expect(at0.root).not.toBe(at1.root);
  });
});
