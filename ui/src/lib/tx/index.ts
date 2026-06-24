import { TREE_DEPTH } from "@/config/constants";
import { MerkleTree } from "../tree";
import { Note } from "./note";

export * from "./note";
export * from "./proof";

export const buildTransaction = async (params: {
    type: 'deposit' | 'withdraw' | 'transfer'
    amount: bigint;
    recipient: string;
}) => {
    const { type, amount, recipient } = params;
    const notes = await getUserNotes();
    const leaves = await getTreeLeaves();
    const tree = MerkleTree.fromLeaves(TREE_DEPTH, leaves);

    // Collect notes to be spent
    const inNotes: Note[] = [];
    let remainingAmount = params.amount;
    for (const note of notes) {
        inNotes.push(note);
        remainingAmount -= note.value;
        if (remainingAmount <= 0n) {
            break;
        }
    }

    const totalNoteAmount = inNotes.reduce((sum, note) => sum + note.value, 0n);

    if (type === 'withdraw' || type === 'transfer') {
        if (totalNoteAmount < amount) {
            throw new Error("Insufficient funds");
        }
    }

    const changeAmount = totalNoteAmount - amount;
    let publicAmount = 0n;
    const owner = 0n;

    const outNotes = [];
    if (type === 'deposit') {
        publicAmount = amount;
        outNotes.push(
            new Note({ owner: '', amount: totalNoteAmount + amount })
        );
        outNotes.push(Note.dummy(owner));
    } else if (type === 'withdraw') {
        outNotes.push(new Note({ owner, amount: changeAmount }));
        outNotes.push(new Note({ owner: recipeint, amount: amount }));
    } else if (type === 'transfer') {
        outNotes.push(new Note({ owner: '', amount: changeAmount }));
        outNotes.push(new Note({ owner: recipient, amount: amount }));
    }


}