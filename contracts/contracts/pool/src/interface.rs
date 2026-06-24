use contract_types::{Groth16Error, Groth16Proof};
use soroban_sdk::{contractclient, crypto::bn254::Bn254Fr, Env, Vec};

#[contractclient(crate_path = "soroban_sdk", name = "CircomGroth16VerifierClient")]
pub trait CircomGroth16VerifierInterface {
    fn verify(
        env: Env,
        proof: Groth16Proof,
        public_inputs: Vec<Bn254Fr>,
    ) -> Result<bool, Groth16Error>;
}
