pragma circom 2.2.3;

include "../../circuits/transact.circom";

// N_INPUTS=2, LEVELS=4 (shallow tree keeps test compilation fast)
component main {public [
    root,
    public_amount,
    ext_data_hash,
    nullifiers,
    output_commitments
]} = Transact(2, 4);
