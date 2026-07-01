import {
  type Point,
  type FrostSignature,
  buildFullMerkleProof,
  poseidonHash,
  Note,
} from "nexus-crypto";
import { BN254_FIELD, TREE_DEPTH, ZERO_LEAF } from "@/config/constants";
import {
  type ExtData,
  type TransactInput,
  computeExtDataHash,
} from "@/api/pool/transact";
import { parseVaultAddress } from "@/lib/vaultAddress";

const N_INPUTS = 2;

export type TxType = "deposit" | "withdraw" | "transfer";

export type BuildTransactParams = {
  type: TxType;
  amount: bigint;
  /** Sender's Stellar address (ExtData.recipient when not withdrawing). */
  sender: string;
  /** Own group keys. */
  groupSpendPublicKey: Point;
  groupViewPublicKey: Point;
  /** Unspent notes owned by this group. */
  notes: Note[];
  /** All commitments, dense by tree index, gaps = ZERO_LEAF. */
  leaves: bigint[];
  /** Stellar destination for a withdraw. */
  withdrawRecipient?: string;
  /** Recipient's 64-byte vault address for a transfer. */
  recipientAddress?: string;
  /**
   * Aggregate FROST signature over `msg`. Optional: `msg` only depends on the
   * built witness, so the usual flow is to build first (no signature), sign the
   * returned `msg`, then set `input.sig_s`/`input.sig_e`.
   */
  signature?: FrostSignature;
};

/**
 * Message the FROST group signs — mirrors transact.circom `msg_hash` exactly:
 *   Poseidon(root, nullifiers[0..N-1], output_commitments[0,1], public_amount, ext_data_hash)
 */
export function deriveTransactMsg(p: {
  root: bigint;
  nullifiers: bigint[];
  outputCommitments: bigint[];
  publicAmount: bigint;
  extDataHash: bigint;
}): bigint {
  return poseidonHash([
    p.root,
    ...p.nullifiers,
    p.outputCommitments[0]!,
    p.outputCommitments[1]!,
    p.publicAmount,
    p.extDataHash,
  ]);
}

function merkleRoot(leaves: bigint[]): bigint {
  return buildFullMerkleProof(
    TREE_DEPTH,
    leaves.length ? leaves : [ZERO_LEAF],
    0,
    ZERO_LEAF,
  ).root;
}

/**
 * Greedy note selection — picks notes in order until `total >= target`.
 * Used for withdraw and transfer where we need to cover a specific spend amount.
 */
function selectInputs(
  notes: Note[],
  target: bigint,
): { selected: Note[]; total: bigint } {
  const selected: Note[] = [];
  let total = 0n;
  for (const n of notes) {
    if (total >= target) break;
    selected.push(n);
    total += n.amount;
  }
  return { selected, total };
}

type InputSlot = { note: Note; real: boolean };

function padInputs(selected: Note[], groupSpendPublicKey: Point): InputSlot[] {
  const slots: InputSlot[] = selected.map((n) => ({ note: n, real: true }));
  while (slots.length < N_INPUTS) {
    slots.push({ note: Note.dummy(groupSpendPublicKey), real: false });
  }
  return slots;
}

/**
 * Collects all witness inputs and builds the `TransactInput` + `ExtData` for a
 * `pool.transact()` call. The aggregate signature is supplied by the caller.
 *
 * Transaction semantics:
 *
 *   deposit  — Merges up to N_INPUTS of the smallest existing notes with the
 *              deposited amount into a single output. This consolidates dust
 *              while adding funds. If there are no existing notes, the two
 *              input slots are dummy notes.
 *              conservation: Σ_inputs + deposit_amount = merged_output + 0
 *
 *   withdraw — Spends enough notes to cover `amount`, sends it to an external
 *              Stellar address, and returns change back to the vault.
 *              conservation: Σ_inputs + (-amount) = change + 0
 *
 *   transfer — Spends enough notes to cover `amount`, sends it to another
 *              shielded vault address, and returns change back to this vault.
 *              conservation: Σ_inputs + 0 = transferred + change
 */
export function buildTransactContext(params: BuildTransactParams): {
  input: TransactInput;
  extData: ExtData;
  msg: bigint;
} {
  const {
    type,
    amount,
    sender,
    groupSpendPublicKey,
    groupViewPublicKey,
    notes,
    leaves,
    withdrawRecipient,
    recipientAddress,
    signature,
  } = params;

  const root = merkleRoot(leaves);

  const selfNote = (amt: bigint) => Note.random(groupSpendPublicKey, amt);

  let inputs: InputSlot[];
  let publicAmount: bigint;
  let extAmount: bigint;
  let recipient: string;
  let out0: { note: Note; encKey: Point };
  let out1: { note: Note; encKey: Point };

  if (type === "deposit") {
    // Pick smallest notes to merge
    const smallest = [...notes]
      .sort((a, b) => (a.amount < b.amount ? -1 : 1))
      .slice(0, N_INPUTS);

    const mergedTotal = smallest.reduce((s, n) => s + n.amount, 0n);

    inputs = padInputs(smallest, groupSpendPublicKey);
    publicAmount = amount;
    extAmount = amount;
    recipient = sender;
    out0 = { note: selfNote(mergedTotal + amount), encKey: groupViewPublicKey };
    out1 = { note: selfNote(0n), encKey: groupViewPublicKey };
  } else if (type === "withdraw") {
    if (!withdrawRecipient)
      throw new Error("withdraw requires a recipient address");

    const { selected, total } = selectInputs(notes, amount);
    if (selected.length > N_INPUTS)
      throw new Error(`too many input notes required (max ${N_INPUTS})`);
    if (total < amount) throw new Error("insufficient funds");

    const change = total - amount;
    inputs = padInputs(selected, groupSpendPublicKey);
    publicAmount = BN254_FIELD - amount; // field-negative
    extAmount = -amount;
    recipient = withdrawRecipient;
    out0 = { note: selfNote(change), encKey: groupViewPublicKey };
    out1 = { note: selfNote(0n), encKey: groupViewPublicKey };
  } else {
    // transfer
    if (!recipientAddress)
      throw new Error("transfer requires a recipient vault address");

    const { selected, total } = selectInputs(notes, amount);
    if (selected.length > N_INPUTS)
      throw new Error(`too many input notes required (max ${N_INPUTS})`);
    if (total < amount) throw new Error("insufficient funds");

    const change = total - amount;
    const recip = parseVaultAddress(recipientAddress);
    inputs = padInputs(selected, groupSpendPublicKey);
    publicAmount = 0n;
    extAmount = 0n;
    recipient = sender;
    out0 = {
      note: Note.random(recip.groupSpendPublicKey, amount),
      encKey: recip.groupViewPublicKey,
    };
    out1 = { note: selfNote(change), encKey: groupViewPublicKey };
  }

  // ── Build witness ─────────────────────────────────────────────────────────

  const zeroPath = Array<bigint>(TREE_DEPTH).fill(0n);
  const nullifiers = inputs.map((s) =>
    s.note.nullifier(BigInt(s.note.index ?? 0)),
  );
  const proofs = inputs.map((s) =>
    s.real
      ? buildFullMerkleProof(TREE_DEPTH, leaves, s.note.index!, ZERO_LEAF)
      : { root, pathElements: zeroPath, pathIndices: zeroPath },
  );

  const outputs = [out0, out1];
  const outputCommitments = outputs.map((o) => o.note.commitment());

  const extData: ExtData = {
    recipient,
    ext_amount: extAmount,
    encrypted_output0: out0.note.encrypt(out0.encKey),
    encrypted_output1: out1.note.encrypt(out1.encKey),
  };
  const extDataHash = computeExtDataHash(extData);
  const msg = deriveTransactMsg({
    root,
    nullifiers,
    outputCommitments,
    publicAmount,
    extDataHash,
  });

  const input: TransactInput = {
    root,
    public_amount: publicAmount,
    ext_data_hash: extDataHash,
    nullifiers,
    output_commitments: outputCommitments,
    agg_pubkey: [groupSpendPublicKey.x, groupSpendPublicKey.y],
    amounts: inputs.map((s) => s.note.amount),
    salts: inputs.map((s) => s.note.salt),
    note_indices: inputs.map((s) => BigInt(s.note.index ?? 0)),
    path_elements: proofs.map((p) => p.pathElements),
    path_indices: proofs.map((p) => p.pathIndices),
    output_pubkeys: [
      [out0.note.pubkey.x, out0.note.pubkey.y],
      [out1.note.pubkey.x, out1.note.pubkey.y],
    ],
    output_amounts: outputs.map((o) => o.note.amount),
    output_salts: outputs.map((o) => o.note.salt),
    sig_s: signature?.s ?? 0n,
    sig_e: signature?.e ?? 0n,
  };

  return { input, extData, msg };
}
