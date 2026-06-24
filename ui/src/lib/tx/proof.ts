import { concatBytes, numberToBytesBE } from "@noble/ciphers/utils.js";
import { circuitPath } from "@/config/constants";
import type { MerkleTree } from "../tree";
import { generateSnarkProof } from "../zk";
import { Note } from "./note";

export const generateTxProof = async (params: {
    type: 'deposit' | 'withdraw' | 'transfer'
    notes: Note[];
    amount: bigint;
    tree: MerkleTree;
}) => {
    const { notes, amount, tree, type } = params;

    const root = tree.root;

    // Collect notes to be spent
    const inNotes: Note[] = [];
    let remainingAmount = params.amount;
    for (const note of notes) {
        inNotes.push(note);
        remainingAmount -= note.amount;
        if (remainingAmount <= 0n) {
            break;
        }
    }

    const totalInNoteAmount = inNotes.reduce((sum, note) => sum + note.amount, 0n);
    if (type === 'withdraw' || type === 'transfer') {
        if (totalInNoteAmount < amount) {
            throw new Error("Insufficient funds");
        }
    }

    // Determine the output notes
    const changeAmount = totalInNoteAmount - amount;
    let publicAmount: bigint = 0n;
    const owner = 0n;
    const outNotes = [];
    if (type === 'deposit') {
        publicAmount = amount;
        outNotes.push(
            new Note({ owner, amount: totalNoteAmount + amount })
        );
        outNotes.push(Note.dummy(owner));
    } else if (type === 'withdraw') {
        outNotes.push(new Note({ owner, amount: changeAmount }));
        outNotes.push(new Note({ owner: recipeint, amount: amount }));
    } else if (type === 'transfer') {
        outNotes.push(new Note({ owner, amount: changeAmount }));
        outNotes.push(new Note({ owner: recipient, amount: amount }));
    } else {
        throw new Error("Invalid transaction type");
    }

    const inPathIndices = [];
    const inPathElements = [];
    for (const note of inNotes) {
        if (note.amount > 0) {
            if (!Number.isFinite(note.index)) {
                throw new Error("Note index required for nullifier");
            }
            const merkleProof = tree.createProof(note.index as number);
            inPathIndices.push(BigInt(note.index as number));
            inPathElements.push(merkleProof.pathElements);
        } else {
            inPathIndices.push(0);
            inPathElements.push(new Array(tree.depth).fill(0));
        }
    }
    const inputs = {
        // Public inputs
        root,
        public_amount: publicAmount,
        ext_data_hash: '',
        nullifiers: inNotes.map((note) => note.nullifier()),
        output_commitments: outNotes.map((n) => n.commitment()),
        // Private inputs of input note
        agg_pubkey: [0n, 0n],
        amounts: inNotes.map((note) => note.amount),
        salts: inNotes.map((note) => note.salt),
        note_indices: inNotes.map((note) => note.index as number),
        path_elements: inPathElements,
        path_indices: inPathIndices,
        // Private inputs of output note
        output_pubkeys: [[]],
        output_amount: outNotes.map((note) => note.amount),
        output_salt: outNotes.map((note) => note.salt),
        // Signature
        sig_s: 0n,
        sig_e: 0n,
    };

    const snarkJs = (globalThis as any).snarkjs;

    if (!snarkJs) {
        throw new Error("Snarkjs not found or not ready");
    }

    const { proof } = await generateSnarkProof({
        snarkJs,
        inputs,
        circuit: circuitPath,
    });

    const proofBigInts = [...proof.a, ...proof.b.flat(), ...proof.c];
    const proofBytesArr = proofBigInts.map((n) => numberToBytesBE(n, 32) as Uint8Array);
    const proofBytes = concatBytes(...proofBytesArr) as Uint8Array;

    const publicInputs = {
        root,
        nullifier: inputs.nullifier,
        outputCommitment: inputs.output_commitment,
        forceDummyNote: inputs.force_dummy_note,
        publicDepositAmount: inputs.public_deposit_amount,
        publicWithdrawAmount: inputs.public_withdraw_amount,
    };

    return {
        proof: proofBytes,
        publicInputs,
    };
};
