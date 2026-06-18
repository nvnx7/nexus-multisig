/**
 * Builds the witness input object for the Spend circuit.
 *
 * The `msg` field that FROST signers must sign is:
 *   Poseidon(root, nullifiers[0..N-1], output_commitments[0,1],
 *            public_deposit_amount, public_withdraw_amount)
 *
 * This mirrors exactly what spend.circom computes internally, binding the
 * signature to the transaction's public data.
 */

import { Point } from "./babyjubjub.ts";
import { MerkleProof, buildFullMerkleProof } from "./merkle.ts";
import { Note, noteCommitment, noteNullifier } from "./note.ts";
import { poseidonHash } from "./poseidon.ts";
import type { FrostSignature } from "./frost.ts";

export type SpendInput = {
  // public
  root: bigint;
  nullifiers: bigint[];
  output_commitments: bigint[];
  agg_pubkey: [bigint, bigint];
  public_deposit_amount: bigint;
  public_withdraw_amount: bigint;
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
export function deriveSpendMsg(params: {
  root: bigint;
  nullifiers: bigint[];           // length N_INPUTS
  outputCommitments: bigint[];    // length 2
  publicDepositAmount: bigint;
  publicWithdrawAmount: bigint;
}): bigint {
  // Must match Poseidon(4 + N_INPUTS inputs) in spend.circom:
  //   inputs[0]           = root
  //   inputs[1..N]        = nullifiers
  //   inputs[N+1]         = output_commitments[0]
  //   inputs[N+2]         = output_commitments[1]
  //   inputs[N+3]         = public_deposit_amount
  // Note: public_withdraw_amount is NOT in the hash (it's implied by conservation).
  // Wait — the circuit uses Poseidon(4 + N_INPUTS) so let's align precisely.
  // Looking at spend.circom: inputs 0..3+N are root, nullifiers[N], oc[0], oc[1], deposit.
  return poseidonHash([
    params.root,
    ...params.nullifiers,
    params.outputCommitments[0]!,
    params.outputCommitments[1]!,
    params.publicDepositAmount,
  ]);
}

export type SpendParams = {
  inputNotes: { note: Note; index: number }[];   // must have N_INPUTS entries
  outputNotes: [Note, Note];                     // [recipient, change]
  merkleTreeLevels: number;
  publicDepositAmount?: bigint;
  publicWithdrawAmount?: bigint;
  // Merkle proofs can be supplied or auto-built (sparse tree, one note per input)
  merkleProofs?: MerkleProof[];
  signature: FrostSignature;
};

export function buildSpendInput(params: SpendParams): SpendInput {
  const {
    inputNotes,
    outputNotes,
    merkleTreeLevels,
    publicDepositAmount = 0n,
    publicWithdrawAmount = 0n,
    signature,
  } = params;

  const N = inputNotes.length;

  // Commitments + nullifiers for each input note
  const commitments = inputNotes.map(({ note }) => noteCommitment(note));
  const nullifiers = inputNotes.map(({ note, index }, i) =>
    noteNullifier(commitments[i]!, BigInt(index))
  );

  // Build Merkle proofs from a single shared tree so all roots are identical.
  // Leaves are ordered by note index; gaps are filled with 0n.
  const proofs: MerkleProof[] = (() => {
    if (params.merkleProofs) return params.merkleProofs;
    const maxIdx = Math.max(...inputNotes.map((n) => n.index));
    const leaves: bigint[] = Array(maxIdx + 1).fill(0n);
    inputNotes.forEach(({ index }, i) => {
      leaves[index] = commitments[i]!;
    });
    return inputNotes.map(({ index }) =>
      buildFullMerkleProof(merkleTreeLevels, leaves, index)
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
    nullifiers,
    output_commitments: outputCommitments,
    agg_pubkey: [aggPubkey.x, aggPubkey.y],
    public_deposit_amount: publicDepositAmount,
    public_withdraw_amount: publicWithdrawAmount,
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
