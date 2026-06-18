pragma circom 2.2.3;

include "../../circuits/spend.circom";

// N_INPUTS=2, LEVELS=4 (shallow tree keeps test compilation fast)
component main {public [
    root,
    nullifiers,
    output_commitments,
    agg_pubkey,
    public_deposit_amount,
    public_withdraw_amount
]} = Spend(2, 4);
