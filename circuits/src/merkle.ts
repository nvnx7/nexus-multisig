import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree";
import { poseidonHash, MERKLE_ZERO_LEAF } from "./poseidon.ts";

export type MerkleProof = {
  root: bigint;
  pathElements: bigint[];
  pathIndices: bigint[];
};

export { MERKLE_ZERO_LEAF };

function toMerkleProof(tree: IncrementalMerkleTree, index: number): MerkleProof {
  const proof = tree.createProof(index);
  return {
    root: proof.root as bigint,
    pathElements: proof.siblings.map((s) => (s[0] ?? 0n) as bigint),
    pathIndices: proof.pathIndices.map((i) => BigInt(i)),
  };
}

export function buildSparseMerkleProof(
  levels: number,
  leaf: bigint,
  leafIndex: number,
  zeroValue: bigint = 0n
): MerkleProof {
  const tree = new IncrementalMerkleTree(poseidonHash, levels, zeroValue, 2);
  for (let i = 0; i < leafIndex; i++) {
    tree.insert(zeroValue);
  }
  tree.insert(leaf);
  return toMerkleProof(tree, leafIndex);
}

export function buildFullMerkleProof(
  levels: number,
  leaves: bigint[],
  leafIndex: number,
  zeroValue: bigint = 0n
): MerkleProof {
  const tree = new IncrementalMerkleTree(poseidonHash, levels, zeroValue, 2);
  for (const leaf of leaves) {
    tree.insert(leaf);
  }
  return toMerkleProof(tree, leafIndex);
}
