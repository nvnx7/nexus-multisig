pragma circom 2.2.3;

include "../node_modules/circomlib/circuits/poseidon.circom";

/// @title NoteNullifier
/// @notice Derives the spend nullifier: Poseidon(commitment, note_index).
/// Revealing the nullifier on-chain prevents double-spend without revealing which note.
template NoteNullifier() {
    signal input commitment;
    signal input note_index;
    signal output nullifier;

    component h = Poseidon(2);
    h.inputs[0] <== commitment;
    h.inputs[1] <== note_index;

    nullifier <== h.out;
}
