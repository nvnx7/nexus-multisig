// @ts-expect-error
import { IncrementalMerkleTree } from "@zk-kit/incremental-merkle-tree";
import { poseidonHash } from "nexus-crypto";
import { ZERO_LEAF } from "@/config/constants";

export type MerkleProof = {
    root: bigint;
    pathElements: bigint[];
    pathIndices: bigint[];
};

export { ZERO_LEAF };

export class MerkleTree {
    private _tree: IncrementalMerkleTree;
    readonly depth: number;
    readonly zeroLeaf: bigint;

    constructor(levels: number) {
        this.depth = levels;
        this.zeroLeaf = ZERO_LEAF;
        this._tree = new IncrementalMerkleTree(poseidonHash, levels, ZERO_LEAF, 2);
    }

    get root(): bigint {
        return this._tree.root as bigint;
    }

    insert(leaf: bigint): void {
        this._tree.insert(leaf);
    }

    insertMany(leaves: bigint[]): void {
        for (const leaf of leaves) {
            this._tree.insert(leaf);
        }
    }

    createProof(index: number): MerkleProof {
        const proof = this._tree.createProof(index);
        return {
            root: proof.root as bigint,
            pathElements: proof.siblings.map((s: any) => (s[0] ?? 0n) as bigint),
            pathIndices: proof.pathIndices.map((i: any) => BigInt(i)),
        };
    }

    /**
     * Build a MerkleTree from a sparse map of { leafIndex → commitment } as
     * returned by GET /api/v1/notes/leaves.
     *
     * Gaps between provided indices are filled with ZERO_LEAF so every leaf
     * position up to the highest known index exists in the tree.
     */
    static fromLeaves(
        levels: number,
        leaves: { leafIndex: number; commitment: bigint }[],
    ): MerkleTree {
        if (leaves.length === 0) return new MerkleTree(levels);

        const sorted = [...leaves].sort((a, b) => a.leafIndex - b.leafIndex);
        const maxIndex = sorted[sorted.length - 1].leafIndex;

        // Build a dense map for O(1) lookup.
        const byIndex = new Map(sorted.map((l) => [l.leafIndex, l.commitment]));

        const tree = new MerkleTree(levels);
        for (let i = 0; i <= maxIndex; i++) {
            tree.insert(byIndex.get(i) ?? ZERO_LEAF);
        }
        return tree;
    }
}
