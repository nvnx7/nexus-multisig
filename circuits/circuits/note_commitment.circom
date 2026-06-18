pragma circom 2.2.3;

include "../node_modules/circomlib/circuits/poseidon.circom";

/// @title NoteCommitment
/// @notice Commits to a UTXO note: Poseidon(pubkey_x, pubkey_y, amount, salt).
/// The pubkey is the FROST aggregate public key of the owning multisig group.
template NoteCommitment() {
    signal input pubkey_x;
    signal input pubkey_y;
    signal input amount;
    signal input salt;
    signal output commitment;

    component h = Poseidon(4);
    h.inputs[0] <== pubkey_x;
    h.inputs[1] <== pubkey_y;
    h.inputs[2] <== amount;
    h.inputs[3] <== salt;

    commitment <== h.out;
}
