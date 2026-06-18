pragma circom 2.2.3;

include "./spend.circom";

// Production entrypoint: 2 input notes, depth-32 Merkle tree.
component main {public [
    root,
    nullifiers,
    output_commitments,
    agg_pubkey,
    public_deposit_amount,
    public_withdraw_amount
]} = Spend(2, 32);
