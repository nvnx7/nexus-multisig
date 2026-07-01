import { type FrostSignature, mod, Note } from "nexus-crypto";
import { BN254_FIELD, TREE_DEPTH } from "@/config/constants";
import {
  type ExtData,
  type TransactInput,
  computeExtDataHash,
} from "@/api/pool/transact";
import { type TxType, deriveTransactMsg } from "./proof";

export type InputNote = {
  amount: string;
  salt: string;
  index: string;
  /** Merkle sibling hashes. Omitted for dummy notes (amount === "0"); zeros are assumed. */
  path_elements?: string[];
};

export type OutputNote = {
  amount: string;
  salt: string;
  /** [x, y] — kept per output because outputs may go to a different vault (transfer). */
  pubkey: [string, string];
};

/** The fully-pinned transaction stored in a sign session. */
export type TxDetails = {
  type: TxType;
  root: string;
  /** FROST aggregate public key [x, y] — used to recompute input note commitments/nullifiers. */
  group_pubkey: [string, string];
  input_notes: InputNote[];
  output_notes: OutputNote[];
  ext_data: {
    recipient: string;
    ext_amount: string;
    encrypted_output0: string;
    encrypted_output1: string;
  };
};

// ── Serialization ─────────────────────────────────────────────────────────────

const s = (n: bigint) => n.toString();

export function toTxDetails(params: {
  type: TxType;
  input: TransactInput;
  extData: ExtData;
}): TxDetails {
  const { type, input, extData } = params;

  const input_notes: InputNote[] = input.amounts.map((amount, i) => {
    const isDummy = amount === 0n;
    const note: InputNote = {
      amount: s(amount),
      salt: s(input.salts[i]!),
      index: s(input.note_indices[i]!),
    };
    if (!isDummy) {
      note.path_elements = input.path_elements[i]!.map(s);
    }
    return note;
  });

  const output_notes: OutputNote[] = input.output_amounts.map((amount, j) => ({
    amount: s(amount),
    salt: s(input.output_salts[j]!),
    pubkey: [s(input.output_pubkeys[j]![0]), s(input.output_pubkeys[j]![1])],
  }));

  return {
    type,
    root: s(input.root),
    group_pubkey: [s(input.agg_pubkey[0]), s(input.agg_pubkey[1])],
    input_notes,
    output_notes,
    ext_data: {
      recipient: extData.recipient,
      ext_amount: s(extData.ext_amount),
      encrypted_output0: extData.encrypted_output0,
      encrypted_output1: extData.encrypted_output1,
    },
  };
}

// ── Witness reconstruction ────────────────────────────────────────────────────

/** Rebuild the full circuit witness from a pinned proposal; attach the aggregate signature. */
export function buildWitnessFromTxDetails(
  d: TxDetails,
  signature?: FrostSignature,
): { input: TransactInput; extData: ExtData } {
  const agg_pubkey: [bigint, bigint] = [
    BigInt(d.group_pubkey[0]),
    BigInt(d.group_pubkey[1]),
  ];
  const groupPubKey = { x: agg_pubkey[0], y: agg_pubkey[1] };

  const amounts = d.input_notes.map((n) => BigInt(n.amount));
  const salts = d.input_notes.map((n) => BigInt(n.salt));
  const note_indices = d.input_notes.map((n) => BigInt(n.index));

  const path_elements = d.input_notes.map((n) =>
    n.path_elements
      ? n.path_elements.map(BigInt)
      : Array<bigint>(TREE_DEPTH).fill(0n),
  );

  // path_indices = binary decomposition of note index (LSB first)
  const path_indices = note_indices.map((idx) => {
    const bits: bigint[] = [];
    let n = idx;
    for (let i = 0; i < TREE_DEPTH; i++) {
      bits.push(n & 1n);
      n >>= 1n;
    }
    return bits;
  });

  const inNotes = amounts.map(
    (amount, i) => new Note(groupPubKey, amount, salts[i]!),
  );
  const nullifiers = inNotes.map((note, i) => note.nullifier(note_indices[i]!));

  const output_amounts = d.output_notes.map((n) => BigInt(n.amount));
  const output_salts = d.output_notes.map((n) => BigInt(n.salt));
  const output_pubkeys = d.output_notes.map(
    (n) => [BigInt(n.pubkey[0]), BigInt(n.pubkey[1])] as [bigint, bigint],
  );
  const output_commitments = d.output_notes.map((n, j) =>
    new Note(
      { x: output_pubkeys[j]![0], y: output_pubkeys[j]![1] },
      output_amounts[j]!,
      output_salts[j]!,
    ).commitment(),
  );

  // public_amount = mod(ext_amount, BN254_FIELD):
  //   deposit  → ext_amount is positive     → same value
  //   withdraw → ext_amount is negative     → BN254_FIELD + ext_amount (field-negative)
  //   transfer → ext_amount is 0            → 0
  const extAmount = BigInt(d.ext_data.ext_amount);
  const public_amount = mod(extAmount, BN254_FIELD);

  const extData: ExtData = {
    recipient: d.ext_data.recipient,
    ext_amount: extAmount,
    encrypted_output0: d.ext_data.encrypted_output0,
    encrypted_output1: d.ext_data.encrypted_output1,
  };
  const ext_data_hash = computeExtDataHash(extData);

  const input: TransactInput = {
    root: BigInt(d.root),
    public_amount,
    ext_data_hash,
    nullifiers,
    output_commitments,
    agg_pubkey,
    amounts,
    salts,
    note_indices,
    path_elements,
    path_indices,
    output_pubkeys: [output_pubkeys[0]!, output_pubkeys[1]!],
    output_amounts,
    output_salts,
    sig_s: signature?.s ?? 0n,
    sig_e: signature?.e ?? 0n,
  };

  return { input, extData };
}

/**
 * Independently recomputes the signing message from a pinned proposal and
 * asserts the witness is well-formed (commitments/nullifiers/ext_data_hash
 * derive from the stated notes, amounts conserve). Co-signers compare the result
 * with the session's `tx_hash` before signing — so they never sign blindly.
 */
export function verifyTxDetails(d: TxDetails): bigint {
  const { input, extData } = buildWitnessFromTxDetails(d);

  // Verify nullifiers match recomputed values
  const owner = { x: input.agg_pubkey[0], y: input.agg_pubkey[1] };
  input.amounts.forEach((amount, i) => {
    const note = new Note(owner, amount, input.salts[i]!);
    if (note.nullifier(input.note_indices[i]!) !== input.nullifiers[i])
      throw new Error("tx_details: input nullifier mismatch");
  });

  // Verify output commitments
  input.output_amounts.forEach((amount, j) => {
    const oc = new Note(
      { x: input.output_pubkeys[j]![0], y: input.output_pubkeys[j]![1] },
      amount,
      input.output_salts[j]!,
    ).commitment();
    if (oc !== input.output_commitments[j])
      throw new Error("tx_details: output commitment mismatch");
  });

  if (computeExtDataHash(extData) !== input.ext_data_hash)
    throw new Error("tx_details: ext_data_hash mismatch");

  const sumIn = input.amounts.reduce((a, b) => a + b, 0n);
  const sumOut = input.output_amounts.reduce((a, b) => a + b, 0n);
  if (
    mod(sumIn + input.public_amount, BN254_FIELD) !== mod(sumOut, BN254_FIELD)
  )
    throw new Error("tx_details: amount conservation violated");

  return deriveTransactMsg({
    root: input.root,
    nullifiers: input.nullifiers,
    outputCommitments: input.output_commitments,
    publicAmount: input.public_amount,
    extDataHash: input.ext_data_hash,
  });
}
