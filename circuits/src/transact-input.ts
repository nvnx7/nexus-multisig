/**
 * Builds the witness input object for the Transact circuit.
 *
 * The `msg` field that FROST signers must sign is:
 *   Poseidon(root, nullifiers[0..N-1], output_commitments[0,1],
 *            public_amount, ext_data_hash)
 *
 * This mirrors exactly what transact.circom computes internally, binding the
 * signature to the transaction's public data.
 */

import {
  type MerkleProof,
  buildFullMerkleProof,
  type Note,
  noteCommitment,
  noteNullifier,
  poseidonHash,
  type FrostSignature,
} from "nexus-crypto";

/**
 * Canonical empty-leaf value for the commitment tree: Poseidon("XLM") =
 * Poseidon(88, 76, 77). MUST match the pool contract's `get_zeroes()[0]`.
 */
export const ZERO_LEAF: bigint = poseidonHash([88n, 76n, 77n]);

export type TransactInput = {
  // public — declared in the same order the pool contract feeds the verifier:
  //   [root, public_amount, ext_data_hash, nullifiers, output_commitments]
  root: bigint;
  public_amount: bigint;
  ext_data_hash: bigint;
  nullifiers: bigint[];
  output_commitments: bigint[];
  // private — FROST aggregate public key
  agg_pubkey: [bigint, bigint];
  // private — per input
  amounts: bigint[];
  salts: bigint[];
  note_indices: bigint[];
  path_elements: bigint[][];
  path_indices: bigint[][];
  // private — outputs
  output_pubkeys: [[bigint, bigint], [bigint, bigint]];
  output_amounts: bigint[];
  output_salts: bigint[];
  // private — signature
  sig_s: bigint;
  sig_e: bigint;
};

/**
 * Derives the message field element that FROST signers should sign.
 * Call this before running FROST; pass the result to `frostSign` / `schnorrSign`.
 */
export function deriveTransactMsg(params: {
  root: bigint;
  nullifiers: bigint[];           // length N_INPUTS
  outputCommitments: bigint[];    // length 2
  publicAmount: bigint;
  extDataHash: bigint;
}): bigint {
  // Must match Poseidon(5 + N_INPUTS inputs) in transact.circom:
  //   inputs[0]           = root
  //   inputs[1..N]        = nullifiers
  //   inputs[N+1]         = output_commitments[0]
  //   inputs[N+2]         = output_commitments[1]
  //   inputs[N+3]         = public_amount
  //   inputs[N+4]         = ext_data_hash
  return poseidonHash([
    params.root,
    ...params.nullifiers,
    params.outputCommitments[0]!,
    params.outputCommitments[1]!,
    params.publicAmount,
    params.extDataHash,
  ]);
}

export type TransactParams = {
  inputNotes: { note: Note; index: number }[];   // must have N_INPUTS entries
  outputNotes: [Note, Note];                     // [recipient, change]
  merkleTreeLevels: number;
  publicAmount?: bigint;
  extDataHash?: bigint;
  // Merkle proofs can be supplied or auto-built (sparse tree, one note per input)
  merkleProofs?: MerkleProof[];
  signature: FrostSignature;
};

export function buildTransactInput(params: TransactParams): TransactInput {
  const {
    inputNotes,
    outputNotes,
    merkleTreeLevels,
    publicAmount = 0n,
    extDataHash = 0n,
    signature,
  } = params;

  const N = inputNotes.length;

  // Commitments + nullifiers for each input note
  const commitments = inputNotes.map(({ note }) => noteCommitment(note));
  const nullifiers = inputNotes.map(({ note, index }, i) =>
    noteNullifier(commitments[i]!, BigInt(index))
  );

  // Build Merkle proofs from a single shared tree so all roots are identical.
  // Leaves are ordered by note index; gaps are filled with the canonical zero leaf.
  const proofs: MerkleProof[] = (() => {
    if (params.merkleProofs) return params.merkleProofs;
    const maxIdx = Math.max(...inputNotes.map((n) => n.index));
    const leaves: bigint[] = Array(maxIdx + 1).fill(ZERO_LEAF);
    inputNotes.forEach(({ index }, i) => {
      leaves[index] = commitments[i]!;
    });
    return inputNotes.map(({ index }) =>
      buildFullMerkleProof(merkleTreeLevels, leaves, index, ZERO_LEAF)
    );
  })();

  // Sanity-check that all proofs share the same root
  const root = proofs[0]!.root;
  for (const p of proofs) {
    if (p.root !== root) throw new Error("Merkle proofs have inconsistent roots");
  }

  // Output commitments
  const outputCommitments = outputNotes.map((note) => noteCommitment(note)) as [
    bigint,
    bigint,
  ];

  // Gather agg_pubkey from the first input note (all inputs share the same owner)
  const aggPubkey = inputNotes[0]!.note.pubkey;

  return {
    root,
    public_amount: publicAmount,
    ext_data_hash: extDataHash,
    nullifiers,
    output_commitments: outputCommitments,
    agg_pubkey: [aggPubkey.x, aggPubkey.y],
    amounts: inputNotes.map(({ note }) => note.amount),
    salts: inputNotes.map(({ note }) => note.salt),
    note_indices: inputNotes.map(({ index }) => BigInt(index)),
    path_elements: proofs.map((p) => p.pathElements),
    path_indices: proofs.map((p) => p.pathIndices),
    output_pubkeys: [
      [outputNotes[0].pubkey.x, outputNotes[0].pubkey.y],
      [outputNotes[1].pubkey.x, outputNotes[1].pubkey.y],
    ],
    output_amounts: outputNotes.map((n) => n.amount),
    output_salts: outputNotes.map((n) => n.salt),
    sig_s: signature.s,
    sig_e: signature.e,
  };
}
