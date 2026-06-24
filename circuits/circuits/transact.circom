pragma circom 2.2.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "./lib/schnorr_verify.circom";
include "./merkle_proof.circom";
include "./note_commitment.circom";
include "./note_nullifier.circom";

/// @title Transact
/// @notice Private UTXO multisig transaction circuit.
///
/// Proves that a threshold group (identified by the FROST aggregate public key `agg_pubkey`)
/// owns N input notes in the commitment Merkle tree and authorises their spend
/// with a single FROST Schnorr signature.  Produces 2 output note commitments:
/// one for the recipient and one for the sender's change.
///
/// Shielded transfers are supported: output notes may carry any public key,
/// so ownership can silently change between groups.
///
/// @param N_INPUTS  Number of input UTXOs to spend simultaneously.
/// @param LEVELS    Depth of the shared commitment Merkle tree.
template Transact(N_INPUTS, LEVELS) {
    // ── public signals ──────────────────────────────────────────────────────
    // Declared first and in this exact order so the proof's public-input vector
    // matches what the pool contract feeds to the on-chain Groth16 verifier:
    //   [root, public_amount, ext_data_hash, nullifiers, output_commitments]
    signal input root;                          // Merkle tree root
    // Net public amount used for deposits and withdrawals.
    //   deposit:  public_amount = +amount
    //   withdraw: public_amount = FIELD_SIZE - amount  (field-negative)
    // The valid range of the underlying external amount is enforced on-chain by
    // the pool contract, which derives this field element from `ext_amount`.
    signal input public_amount;
    // Hash of the external transaction data (recipient, ext_amount, encrypted
    // outputs).  The pool contract recomputes this from `ext_data` and checks it
    // equals this public input, binding the proof to those parameters.  It is
    // folded into the signed message below so the threshold group also authorises
    // the external data (e.g. the withdrawal recipient).
    signal input ext_data_hash;
    signal input nullifiers[N_INPUTS];          // one per input note (prevents double-spend)
    signal input output_commitments[2];         // [recipient, change]

    // ── private signals — FROST aggregate public key ─────────────────────────
    // Identifies the threshold group that owns the input notes.  Kept private so
    // the group's identity is not revealed on-chain.
    signal input agg_pubkey[2];                 // FROST aggregate public key (x, y)

    // ── private signals — per input note ────────────────────────────────────
    signal input amounts[N_INPUTS];
    signal input salts[N_INPUTS];
    signal input note_indices[N_INPUTS];
    signal input path_elements[N_INPUTS][LEVELS];
    signal input path_indices[N_INPUTS][LEVELS];

    // ── private signals — output notes (2 outputs) ──────────────────────────
    // output_pubkeys[j][0] = x, output_pubkeys[j][1] = y for output note j.
    // These may differ from agg_pubkey to enable shielded transfers.
    signal input output_pubkeys[2][2];
    signal input output_amounts[2];
    signal input output_salts[2];

    // ── private signals — FROST Schnorr signature ───────────────────────────
    // One signature covers all N_INPUTS notes.  Signing key = agg_pubkey.
    signal input sig_s;
    signal input sig_e;

    // ────────────────────────────────────────────────────────────────────────
    // 1. Derive the signed message from public signals.
    //    msg = Poseidon(root, nullifiers[0..N-1], output_commitments[0,1],
    //                   public_amount, ext_data_hash)
    //
    //    For N_INPUTS=2: Poseidon of 7 field elements.
    //    Signers compute the same hash off-chain before running FROST.  Folding
    //    ext_data_hash in here both constrains that public input and binds the
    //    signature to the external data (recipient, amounts, encrypted outputs).
    // ────────────────────────────────────────────────────────────────────────
    component msg_hash = Poseidon(5 + N_INPUTS);
    msg_hash.inputs[0] <== root;
    for (var i = 0; i < N_INPUTS; i++) {
        msg_hash.inputs[1 + i] <== nullifiers[i];
    }
    msg_hash.inputs[1 + N_INPUTS] <== output_commitments[0];
    msg_hash.inputs[2 + N_INPUTS] <== output_commitments[1];
    msg_hash.inputs[3 + N_INPUTS] <== public_amount;
    msg_hash.inputs[4 + N_INPUTS] <== ext_data_hash;

    // ────────────────────────────────────────────────────────────────────────
    // 2. Verify FROST Schnorr signature against the derived message.
    //    One signature authorises spending all N input notes.
    // ────────────────────────────────────────────────────────────────────────
    component schnorr = SchnorrVerify();
    schnorr.enabled   <== 1;
    schnorr.msg       <== msg_hash.out;
    schnorr.pubkey[0] <== agg_pubkey[0];
    schnorr.pubkey[1] <== agg_pubkey[1];
    schnorr.s         <== sig_s;
    schnorr.e         <== sig_e;

    // ────────────────────────────────────────────────────────────────────────
    // 3. For each input note: commitment -> nullifier -> Merkle inclusion.
    //    All inputs must belong to the same tree root.
    // ────────────────────────────────────────────────────────────────────────
    component in_commitments[N_INPUTS];
    component nullifier_checks[N_INPUTS];
    component merkle_proofs[N_INPUTS];

    for (var i = 0; i < N_INPUTS; i++) {
        in_commitments[i] = NoteCommitment();
        in_commitments[i].pubkey_x <== agg_pubkey[0];
        in_commitments[i].pubkey_y <== agg_pubkey[1];
        in_commitments[i].amount   <== amounts[i];
        in_commitments[i].salt     <== salts[i];

        nullifier_checks[i] = NoteNullifier();
        nullifier_checks[i].commitment <== in_commitments[i].commitment;
        nullifier_checks[i].note_index <== note_indices[i];
        nullifiers[i] === nullifier_checks[i].nullifier;

        merkle_proofs[i] = MerkleProof(LEVELS);
        merkle_proofs[i].leaf <== in_commitments[i].commitment;
        for (var j = 0; j < LEVELS; j++) {
            merkle_proofs[i].path_elements[j] <== path_elements[i][j];
            merkle_proofs[i].path_indices[j]  <== path_indices[i][j];
        }
        root === merkle_proofs[i].root;
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. Compute and verify output note commitments.
    //    Output pubkeys may differ from agg_pubkey (shielded transfer).
    // ────────────────────────────────────────────────────────────────────────
    component out_commitments[2];
    component out_amount_range[2];
    for (var j = 0; j < 2; j++) {
        out_commitments[j] = NoteCommitment();
        out_commitments[j].pubkey_x <== output_pubkeys[j][0];
        out_commitments[j].pubkey_y <== output_pubkeys[j][1];
        out_commitments[j].amount   <== output_amounts[j];
        out_commitments[j].salt     <== output_salts[j];
        output_commitments[j] === out_commitments[j].commitment;

        // Range-check each output amount to 248 bits.  This keeps every output
        // (and therefore their sum) well below the field modulus so the
        // conservation equation below cannot be satisfied via field wraparound.
        out_amount_range[j] = Num2Bits(248);
        out_amount_range[j].in <== output_amounts[j];
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. Amount conservation (single public amount, tornado-nova style):
    //    sum(input amounts) + public_amount == sum(output amounts)
    //
    //    public_amount carries deposits as a positive value and withdrawals as
    //    a field-negative value (FIELD_SIZE - amount), so one equation covers
    //    both directions.
    // ────────────────────────────────────────────────────────────────────────
    var sum_in = 0;
    for (var i = 0; i < N_INPUTS; i++) {
        sum_in += amounts[i];
    }

    var sum_out = 0;
    for (var j = 0; j < 2; j++) {
        sum_out += output_amounts[j];
    }

    sum_in + public_amount === sum_out;
}
