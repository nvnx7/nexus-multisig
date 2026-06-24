pragma circom 2.2.3;

include "./transact.circom";

// Production entrypoint: 2 input notes, depth-20 Merkle tree.
// Public inputs are listed in the same order the pool contract feeds them to
// the on-chain Groth16 verifier:
//   [root, public_amount, ext_data_hash, nullifiers, output_commitments]
component main {public [
    root,
    public_amount,
    ext_data_hash,
    nullifiers,
    output_commitments
]} = Transact(2, 20);
