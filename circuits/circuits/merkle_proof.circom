pragma circom 2.2.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

/// @title MerkleProof
/// @notice Verifies a Merkle inclusion proof using Poseidon hashes.
/// @param levels  Depth of the Merkle tree.
template MerkleProof(levels) {
    signal input leaf;
    signal input path_elements[levels];
    signal input path_indices[levels];   // 0 => leaf is left child, 1 => leaf is right child
    signal output root;

    component hashers[levels];
    component mux[levels][2];

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        path_indices[i] * (1 - path_indices[i]) === 0;

        mux[i][0] = Mux1();
        mux[i][0].c[0] <== hashes[i];
        mux[i][0].c[1] <== path_elements[i];
        mux[i][0].s    <== path_indices[i];

        mux[i][1] = Mux1();
        mux[i][1].c[0] <== path_elements[i];
        mux[i][1].c[1] <== hashes[i];
        mux[i][1].s    <== path_indices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== mux[i][0].out;
        hashers[i].inputs[1] <== mux[i][1].out;

        hashes[i + 1] <== hashers[i].out;
    }

    root <== hashes[levels];
}
