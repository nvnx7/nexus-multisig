//! Constants for BN256 field operations

use soroban_sdk::{Bytes, Env, U256};

/// BN256 field modulus
pub const BN256_MOD_BYTES: [u8; 32] = [
    48, 100, 78, 114, 225, 49, 160, 41, 184, 80, 69, 182, 129, 129, 88, 93, 40, 51, 232, 72, 121,
    185, 112, 145, 67, 225, 245, 147, 240, 0, 0, 1,
];

/// Get the BN256 modulus as U256
pub fn bn256_modulus(env: &Env) -> U256 {
    U256::from_be_bytes(env, &Bytes::from_array(env, &BN256_MOD_BYTES))
}
