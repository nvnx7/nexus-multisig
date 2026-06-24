import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}




/**
 * Storage keys for Merkle tree persistent data
 */
export type MerkleDataKey = {tag: "Levels", values: void} | {tag: "CurrentRootIndex", values: void} | {tag: "NextIndex", values: void} | {tag: "FilledSubtree", values: readonly [u32]} | {tag: "Root", values: readonly [u32]};

/**
 * Contract error types for the privacy pool
 */
export const Errors = {
  /**
   * Caller is not authorized to perform this operation
   */
  1: {message:"NotAuthorized"},
  /**
   * Merkle tree has reached maximum capacity
   */
  2: {message:"MerkleTreeFull"},
  /**
   * Contract has already been initialized
   */
  3: {message:"AlreadyInitialized"},
  /**
   * Invalid Merkle tree levels configuration
   */
  4: {message:"WrongLevels"},
  /**
   * Internal error: next leaf index is not even
   */
  5: {message:"NextIndexNotEven"},
  /**
   * External amount is invalid (negative or exceeds 2^248)
   */
  6: {message:"WrongExtAmount"},
  /**
   * Zero-knowledge proof verification failed or proof is empty
   */
  7: {message:"InvalidProof"},
  /**
   * Provided Merkle root is not in the recent history
   */
  8: {message:"UnknownRoot"},
  /**
   * Nullifier has already been spent (double-spend attempt)
   */
  9: {message:"AlreadySpentNullifier"},
  /**
   * External data hash does not match the provided data
   */
  10: {message:"WrongExtHash"},
  /**
   * Contract is not initialized
   */
  11: {message:"NotInitialized"},
  /**
   * Arithmetic overflow occurred
   */
  12: {message:"Overflow"},
  /**
   * Public input is not canonical in the BN254 scalar field
   */
  13: {message:"NonCanonicalPublicInput"}
}





/**
 * Zero-knowledge proof data for a transaction
 * 
 * Contains all the cryptographic data needed to verify a transaction,
 * including the proof itself, public inputs, and nullifiers.
 */
export interface Proof {
  /**
 * Hash of the external data (binds proof to transaction parameters)
 */
ext_data_hash: Buffer;
  /**
 * Nullifiers for spent input UTXOs (prevents double-spending)
 */
input_nullifiers: Array<u256>;
  /**
 * Commitment for the first output UTXO
 */
output_commitment0: u256;
  /**
 * Commitment for the second output UTXO
 */
output_commitment1: u256;
  /**
 * The serialized zero-knowledge proof
 */
proof: Groth16Proof;
  /**
 * Net public amount (deposit - withdrawal, modulo field size)
 */
public_amount: u256;
  /**
 * Merkle root the proof was generated against
 */
root: u256;
}


/**
 * User account registration data
 * 
 * Used for registering a user's public key to enable encrypted communication
 * for receiving transfers.
 * Not required to interact with the pool. But facilitates in-pool transfers
 * via events. As parties can learn about each other public key.
 */
export interface Account {
  /**
 * Owner address of the account
 */
owner: string;
  /**
 * BabyJubJub spend public key, compressed (iden3 pack format: 32 bytes LE
 * with bit 255 = sign of x). Used for creating note commitments in the ZK circuit.
 */
spend_public_key: Buffer;
  /**
 * X25519 view public key for ECDH-encrypting note data (32 bytes).
 */
view_public_key: Buffer;
}


/**
 * External data for a transaction
 * 
 * Contains public information about the transaction that is hashed and
 * included in the zero-knowledge proof to bind the proof to specific
 * transaction parameters (e.g. recipient address).
 */
export interface ExtData {
  /**
 * Encrypted data for the first output UTXO
 */
encrypted_output0: Buffer;
  /**
 * Encrypted data for the second output UTXO
 */
encrypted_output1: Buffer;
  /**
 * External amount: positive for deposits, negative for withdrawals
 */
ext_amount: i256;
  /**
 * Recipient address for withdrawals
 */
recipient: string;
}

/**
 * Errors that can occur during Groth16 proof verification.
 */
export const Groth16Error = {
  /**
   * The pairing product did not equal identity.
   */
  0: {message:"InvalidProof"},
  /**
   * The public inputs length does not match the verification key.
   */
  1: {message:"MalformedPublicInputs"},
  /**
   * The proof bytes are malformed.
   */
  2: {message:"MalformedProof"}
}


/**
 * Groth16 proof composed of points A, B, and C.
 * G2 point B uses Soroban's c1||c0 (imaginary||real) ordering.
 */
export interface Groth16Proof {
  /**
 * Point A
 */
a: Buffer;
  /**
 * Point B
 */
b: Buffer;
  /**
 * Point C
 */
c: Buffer;
}


/**
 * Groth16 verification key for BN254 curve (byte-oriented).
 * All G2 points use Soroban's c1||c0 (imaginary||real) ordering.
 */
export interface VerificationKeyBytes {
  /**
 * Alpha G1 point
 */
alpha: Buffer;
  /**
 * Beta G2 point
 */
beta: Buffer;
  /**
 * Delta G2 point
 */
delta: Buffer;
  /**
 * Gamma G2 point
 */
gamma: Buffer;
  /**
 * IC (public input commitments)
 */
ic: Array<Buffer>;
}

export interface Client {
  /**
   * Construct and simulate a hello transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  hello: ({to}: {to: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_root transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the latest root of the Merkle tree that defines the pool
   */
  get_root: (options?: MethodOptions) => Promise<AssembledTransaction<Result<u256>>>

  /**
   * Construct and simulate a register transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Register a user's public encryption key
   * 
   * Allows users to publish their public key so others can send them
   * encrypted outputs for private transfers.
   * The account owner must authorize this call
   * 
   * # Arguments
   * 
   * * `env` - The Soroban environment
   * * `account` - Account data containing owner address and public key
   */
  register: ({account}: {account: Account}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a transact transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Execute a shielded transaction with deposit handling
   * 
   * This is the main entry point for users to interact with the pool.
   * If `ext_amount > 0`, tokens are transferred from the sender to the pool
   * before processing the transaction.
   * 
   * # Arguments
   * 
   * * `env` - The Soroban environment
   * * `proof` - Zero-knowledge proof and public inputs
   * * `ext_data` - External transaction data
   * * `sender` - Address of the transaction sender (must authorize funding
   * transaction)
   * 
   * # Returns
   * 
   * Returns `Ok(())` on success, or an error if validation fails
   */
  transact: ({proof, ext_data, sender}: {proof: Proof, ext_data: ExtData, sender: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a update_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update the contract administrator
   * 
   * Transfers administrative control to a new address. Requires
   * authorization from the current admin.
   * 
   * # Arguments
   * 
   * * `env` - The Soroban environment
   * * `new_admin` - New address that will have administrative permissions
   */
  update_admin: ({new_admin}: {new_admin: string}, options?: MethodOptions) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  approve: ({from, spender, amount}: {from: string, spender: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  balance: ({id}: {id: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer: ({from, to, amount}: {from: string, to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a allowance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  allowance: ({from, spender}: {from: string, spender: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a transfer_from transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_from: ({from, to, amount}: {from: string, to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
        /** Constructor/Initialization Args for the contract's `__constructor` method */
        {admin, token, verifier, maximum_deposit_amount, levels}: {admin: string, token: string, verifier: string, maximum_deposit_amount: u256, levels: u32},
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy({admin, token, verifier, maximum_deposit_amount, levels}, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAACxTdG9yYWdlIGtleXMgZm9yIE1lcmtsZSB0cmVlIHBlcnNpc3RlbnQgZGF0YQAAAAAAAAANTWVya2xlRGF0YUtleQAAAAAAAAUAAAAAAAAAI051bWJlciBvZiBsZXZlbHMgaW4gdGhlIE1lcmtsZSB0cmVlAAAAAAZMZXZlbHMAAAAAAAAAAAAwQ3VycmVudCBwb3NpdGlvbiBpbiB0aGUgcm9vdCBoaXN0b3J5IHJpbmcgYnVmZmVyAAAAEEN1cnJlbnRSb290SW5kZXgAAAAAAAAAJ05leHQgYXZhaWxhYmxlIGluZGV4IGZvciBsZWFmIGluc2VydGlvbgAAAAAJTmV4dEluZGV4AAAAAAAAAQAAAIhTdWJ0cmVlIGhhc2hlcyBhdCBlYWNoIGxldmVsIChpbmRleGVkIGJ5IGxldmVsKS4gT25seSB3cml0dGVuIG9uY2UgYQpsZWZ0IGNoaWxkIGlzIGZpbGxlZCBhdCB0aGF0IGxldmVsOyBhYnNlbnQg4oeSIHN0aWxsIHRoZSB6ZXJvIGhhc2guAAAADUZpbGxlZFN1YnRyZWUAAAAAAAABAAAABAAAAAEAAAAcSGlzdG9yaWNhbCByb290cyByaW5nIGJ1ZmZlcgAAAARSb290AAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAFaGVsbG8AAAAAAAABAAAAAAAAAAJ0bwAAAAAAEAAAAAEAAAPqAAAAEA==",
        "AAAAAAAAADxHZXQgdGhlIGxhdGVzdCByb290IG9mIHRoZSBNZXJrbGUgdHJlZSB0aGF0IGRlZmluZXMgdGhlIHBvb2wAAAAIZ2V0X3Jvb3QAAAAAAAAAAQAAA+kAAAAMAAAAAw==",
        "AAAAAAAAATBSZWdpc3RlciBhIHVzZXIncyBwdWJsaWMgZW5jcnlwdGlvbiBrZXkKCkFsbG93cyB1c2VycyB0byBwdWJsaXNoIHRoZWlyIHB1YmxpYyBrZXkgc28gb3RoZXJzIGNhbiBzZW5kIHRoZW0KZW5jcnlwdGVkIG91dHB1dHMgZm9yIHByaXZhdGUgdHJhbnNmZXJzLgpUaGUgYWNjb3VudCBvd25lciBtdXN0IGF1dGhvcml6ZSB0aGlzIGNhbGwKCiMgQXJndW1lbnRzCgoqIGBlbnZgIC0gVGhlIFNvcm9iYW4gZW52aXJvbm1lbnQKKiBgYWNjb3VudGAgLSBBY2NvdW50IGRhdGEgY29udGFpbmluZyBvd25lciBhZGRyZXNzIGFuZCBwdWJsaWMga2V5AAAACHJlZ2lzdGVyAAAAAQAAAAAAAAAHYWNjb3VudAAAAAfQAAAAB0FjY291bnQAAAAAAA==",
        "AAAAAAAAAgtFeGVjdXRlIGEgc2hpZWxkZWQgdHJhbnNhY3Rpb24gd2l0aCBkZXBvc2l0IGhhbmRsaW5nCgpUaGlzIGlzIHRoZSBtYWluIGVudHJ5IHBvaW50IGZvciB1c2VycyB0byBpbnRlcmFjdCB3aXRoIHRoZSBwb29sLgpJZiBgZXh0X2Ftb3VudCA+IDBgLCB0b2tlbnMgYXJlIHRyYW5zZmVycmVkIGZyb20gdGhlIHNlbmRlciB0byB0aGUgcG9vbApiZWZvcmUgcHJvY2Vzc2luZyB0aGUgdHJhbnNhY3Rpb24uCgojIEFyZ3VtZW50cwoKKiBgZW52YCAtIFRoZSBTb3JvYmFuIGVudmlyb25tZW50CiogYHByb29mYCAtIFplcm8ta25vd2xlZGdlIHByb29mIGFuZCBwdWJsaWMgaW5wdXRzCiogYGV4dF9kYXRhYCAtIEV4dGVybmFsIHRyYW5zYWN0aW9uIGRhdGEKKiBgc2VuZGVyYCAtIEFkZHJlc3Mgb2YgdGhlIHRyYW5zYWN0aW9uIHNlbmRlciAobXVzdCBhdXRob3JpemUgZnVuZGluZwp0cmFuc2FjdGlvbikKCiMgUmV0dXJucwoKUmV0dXJucyBgT2soKCkpYCBvbiBzdWNjZXNzLCBvciBhbiBlcnJvciBpZiB2YWxpZGF0aW9uIGZhaWxzAAAAAAh0cmFuc2FjdAAAAAMAAAAAAAAABXByb29mAAAAAAAH0AAAAAVQcm9vZgAAAAAAAAAAAAAIZXh0X2RhdGEAAAfQAAAAB0V4dERhdGEAAAAAAAAAAAZzZW5kZXIAAAAAABMAAAABAAAD6QAAAAIAAAAD",
        "AAAAAAAAAPpVcGRhdGUgdGhlIGNvbnRyYWN0IGFkbWluaXN0cmF0b3IKClRyYW5zZmVycyBhZG1pbmlzdHJhdGl2ZSBjb250cm9sIHRvIGEgbmV3IGFkZHJlc3MuIFJlcXVpcmVzCmF1dGhvcml6YXRpb24gZnJvbSB0aGUgY3VycmVudCBhZG1pbi4KCiMgQXJndW1lbnRzCgoqIGBlbnZgIC0gVGhlIFNvcm9iYW4gZW52aXJvbm1lbnQKKiBgbmV3X2FkbWluYCAtIE5ldyBhZGRyZXNzIHRoYXQgd2lsbCBoYXZlIGFkbWluaXN0cmF0aXZlIHBlcm1pc3Npb25zAAAAAAAMdXBkYXRlX2FkbWluAAAAAQAAAAAAAAAJbmV3X2FkbWluAAAAAAAAEwAAAAEAAAPpAAAAAgAAAAM=",
        "AAAAAAAAAnxDb25zdHJ1Y3RvcjogaW5pdGlhbGl6ZSB0aGUgcHJpdmFjeSBwb29sIGNvbnRyYWN0CgpTZXRzIHVwIHRoZSBjb250cmFjdCB3aXRoIHRoZSBzcGVjaWZpZWQgdG9rZW4sIHZlcmlmaWVyLCBhbmQgTWVya2xlIHRyZWUKY29uZmlndXJhdGlvbi4gVGhpcyBmdW5jdGlvbiBjYW4gb25seSBiZSBjYWxsZWQgb25jZS4KCiMgQXJndW1lbnRzCgoqIGBlbnZgIC0gVGhlIFNvcm9iYW4gZW52aXJvbm1lbnQKKiBgYWRtaW5gIC0gQWRkcmVzcyBvZiB0aGUgY29udHJhY3QgYWRtaW5pc3RyYXRvcgoqIGB0b2tlbmAgLSBBZGRyZXNzIG9mIHRoZSB0b2tlbiBjb250cmFjdCBmb3IgZGVwb3NpdHMvd2l0aGRyYXdhbHMKKiBgdmVyaWZpZXJgIC0gQWRkcmVzcyBvZiB0aGUgWksgcHJvb2YgdmVyaWZpZXIgY29udHJhY3QKKiBgbWF4aW11bV9kZXBvc2l0X2Ftb3VudGAgLSBNYXhpbXVtIGFsbG93ZWQgZGVwb3NpdCBwZXIgdHJhbnNhY3Rpb24KKiBgbGV2ZWxzYCAtIE51bWJlciBvZiBsZXZlbHMgaW4gdGhlIGNvbW1pdG1lbnQgTWVya2xlIHRyZWUgKDEtMzIpCgojIFJldHVybnMKClJldHVybnMgYE9rKCgpKWAgb24gc3VjY2Vzcywgb3IgYW4gZXJyb3IgaWYgYWxyZWFkeSBpbml0aWFsaXplZCBvcgppbnZhbGlkIGNvbmZpZ3VyYXRpb24AAAANX19jb25zdHJ1Y3RvcgAAAAAAAAUAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAAh2ZXJpZmllcgAAABMAAAAAAAAAFm1heGltdW1fZGVwb3NpdF9hbW91bnQAAAAAAAwAAAAAAAAABmxldmVscwAAAAAABAAAAAEAAAPpAAAAAgAAAAM=",
        "AAAABAAAAClDb250cmFjdCBlcnJvciB0eXBlcyBmb3IgdGhlIHByaXZhY3kgcG9vbAAAAAAAAAAAAAAFRXJyb3IAAAAAAAANAAAAMkNhbGxlciBpcyBub3QgYXV0aG9yaXplZCB0byBwZXJmb3JtIHRoaXMgb3BlcmF0aW9uAAAAAAANTm90QXV0aG9yaXplZAAAAAAAAAEAAAAoTWVya2xlIHRyZWUgaGFzIHJlYWNoZWQgbWF4aW11bSBjYXBhY2l0eQAAAA5NZXJrbGVUcmVlRnVsbAAAAAAAAgAAACVDb250cmFjdCBoYXMgYWxyZWFkeSBiZWVuIGluaXRpYWxpemVkAAAAAAAAEkFscmVhZHlJbml0aWFsaXplZAAAAAAAAwAAAChJbnZhbGlkIE1lcmtsZSB0cmVlIGxldmVscyBjb25maWd1cmF0aW9uAAAAC1dyb25nTGV2ZWxzAAAAAAQAAAArSW50ZXJuYWwgZXJyb3I6IG5leHQgbGVhZiBpbmRleCBpcyBub3QgZXZlbgAAAAAQTmV4dEluZGV4Tm90RXZlbgAAAAUAAAA2RXh0ZXJuYWwgYW1vdW50IGlzIGludmFsaWQgKG5lZ2F0aXZlIG9yIGV4Y2VlZHMgMl4yNDgpAAAAAAAOV3JvbmdFeHRBbW91bnQAAAAAAAYAAAA6WmVyby1rbm93bGVkZ2UgcHJvb2YgdmVyaWZpY2F0aW9uIGZhaWxlZCBvciBwcm9vZiBpcyBlbXB0eQAAAAAADEludmFsaWRQcm9vZgAAAAcAAAAxUHJvdmlkZWQgTWVya2xlIHJvb3QgaXMgbm90IGluIHRoZSByZWNlbnQgaGlzdG9yeQAAAAAAAAtVbmtub3duUm9vdAAAAAAIAAAAN051bGxpZmllciBoYXMgYWxyZWFkeSBiZWVuIHNwZW50IChkb3VibGUtc3BlbmQgYXR0ZW1wdCkAAAAAFUFscmVhZHlTcGVudE51bGxpZmllcgAAAAAAAAkAAAAzRXh0ZXJuYWwgZGF0YSBoYXNoIGRvZXMgbm90IG1hdGNoIHRoZSBwcm92aWRlZCBkYXRhAAAAAAxXcm9uZ0V4dEhhc2gAAAAKAAAAG0NvbnRyYWN0IGlzIG5vdCBpbml0aWFsaXplZAAAAAAOTm90SW5pdGlhbGl6ZWQAAAAAAAsAAAAcQXJpdGhtZXRpYyBvdmVyZmxvdyBvY2N1cnJlZAAAAAhPdmVyZmxvdwAAAAwAAAA3UHVibGljIGlucHV0IGlzIG5vdCBjYW5vbmljYWwgaW4gdGhlIEJOMjU0IHNjYWxhciBmaWVsZAAAAAAXTm9uQ2Fub25pY2FsUHVibGljSW5wdXQAAAAADQ==",
        "AAAABQAAATRFdmVudCBlbWl0dGVkIHdoZW4gYSB1c2VyIHJlZ2lzdGVycyB0aGVpciBwdWJsaWMga2V5cwoKVGhpcyBldmVudCBhbGxvd3Mgb3RoZXIgdXNlcnMgdG8gZGlzY292ZXIga2V5cyBmb3Igc2VuZGluZyBwcml2YXRlCnRyYW5zZmVycy4gVHdvIGtleSB0eXBlcyBhcmUgcHVibGlzaGVkOgotIHNwZW5kX3B1YmxpY19rZXk6IEJhYnlKdWJKdWIgcG9pbnQgKGNvbXByZXNzZWQsIDMyIGJ5dGVzKSBmb3Igbm90ZSBjb21taXRtZW50cwotIHZpZXdfcHVibGljX2tleTogWDI1NTE5IGtleSAoMzIgYnl0ZXMpIGZvciBlbmNyeXB0aW5nIG5vdGUgZGF0YQAAAAAAAAAOUHVibGljS2V5RXZlbnQAAAAAAAEAAAAQcHVibGljX2tleV9ldmVudAAAAAMAAAAcQWRkcmVzcyBvZiB0aGUgYWNjb3VudCBvd25lcgAAAAVvd25lcgAAAAAAABMAAAABAAAAMkJhYnlKdWJKdWIgc3BlbmQgcHVibGljIGtleSwgY29tcHJlc3NlZCAoMzIgYnl0ZXMpAAAAAAAQc3BlbmRfcHVibGljX2tleQAAA+4AAAAgAAAAAAAAACFYMjU1MTkgdmlldyBwdWJsaWMga2V5ICgzMiBieXRlcykAAAAAAAAPdmlld19wdWJsaWNfa2V5AAAAA+4AAAAgAAAAAAAAAAI=",
        "AAAABQAAAHRFdmVudCBlbWl0dGVkIHdoZW4gYSBudWxsaWZpZXIgaXMgc3BlbnQKClRoaXMgZXZlbnQgYWxsb3dzIG9mZi1jaGFpbiBvYnNlcnZlcnMgdG8gdHJhY2sgd2hpY2ggVVRYT3MgaGF2ZSBiZWVuIHNwZW50LgAAAAAAAAARTmV3TnVsbGlmaWVyRXZlbnQAAAAAAAABAAAAE25ld19udWxsaWZpZXJfZXZlbnQAAAAAAQAAABxUaGUgbnVsbGlmaWVyIHRoYXQgd2FzIHNwZW50AAAACW51bGxpZmllcgAAAAAAAAwAAAABAAAAAg==",
        "AAAABQAAAKBFdmVudCBlbWl0dGVkIHdoZW4gYSBuZXcgY29tbWl0bWVudCBpcyBhZGRlZCB0byB0aGUgTWVya2xlIHRyZWUKClRoaXMgZXZlbnQgYWxsb3dzIG9mZi1jaGFpbiBvYnNlcnZlcnMgdG8gdHJhY2sgbmV3IFVUWE9zIGFuZCBkZWNyeXB0Cm91dHB1dHMgaW50ZW5kZWQgZm9yIHRoZW0uAAAAAAAAABJOZXdDb21taXRtZW50RXZlbnQAAAAAAAEAAAAUbmV3X2NvbW1pdG1lbnRfZXZlbnQAAAADAAAAJVRoZSBjb21taXRtZW50IGhhc2ggYWRkZWQgdG8gdGhlIHRyZWUAAAAAAAAKY29tbWl0bWVudAAAAAAADAAAAAEAAAAhSW5kZXggcG9zaXRpb24gaW4gdGhlIE1lcmtsZSB0cmVlAAAAAAAABWluZGV4AAAAAAAABAAAAAAAAAA0RW5jcnlwdGVkIG91dHB1dCBkYXRhIChkZWNyeXB0YWJsZSBieSB0aGUgcmVjaXBpZW50KQAAABBlbmNyeXB0ZWRfb3V0cHV0AAAADgAAAAAAAAAC",
        "AAAAAQAAAKtaZXJvLWtub3dsZWRnZSBwcm9vZiBkYXRhIGZvciBhIHRyYW5zYWN0aW9uCgpDb250YWlucyBhbGwgdGhlIGNyeXB0b2dyYXBoaWMgZGF0YSBuZWVkZWQgdG8gdmVyaWZ5IGEgdHJhbnNhY3Rpb24sCmluY2x1ZGluZyB0aGUgcHJvb2YgaXRzZWxmLCBwdWJsaWMgaW5wdXRzLCBhbmQgbnVsbGlmaWVycy4AAAAAAAAAAAVQcm9vZgAAAAAAAAcAAABBSGFzaCBvZiB0aGUgZXh0ZXJuYWwgZGF0YSAoYmluZHMgcHJvb2YgdG8gdHJhbnNhY3Rpb24gcGFyYW1ldGVycykAAAAAAAANZXh0X2RhdGFfaGFzaAAAAAAAA+4AAAAgAAAAO051bGxpZmllcnMgZm9yIHNwZW50IGlucHV0IFVUWE9zIChwcmV2ZW50cyBkb3VibGUtc3BlbmRpbmcpAAAAABBpbnB1dF9udWxsaWZpZXJzAAAD6gAAAAwAAAAkQ29tbWl0bWVudCBmb3IgdGhlIGZpcnN0IG91dHB1dCBVVFhPAAAAEm91dHB1dF9jb21taXRtZW50MAAAAAAADAAAACVDb21taXRtZW50IGZvciB0aGUgc2Vjb25kIG91dHB1dCBVVFhPAAAAAAAAEm91dHB1dF9jb21taXRtZW50MQAAAAAADAAAACNUaGUgc2VyaWFsaXplZCB6ZXJvLWtub3dsZWRnZSBwcm9vZgAAAAAFcHJvb2YAAAAAAAfQAAAADEdyb3RoMTZQcm9vZgAAADtOZXQgcHVibGljIGFtb3VudCAoZGVwb3NpdCAtIHdpdGhkcmF3YWwsIG1vZHVsbyBmaWVsZCBzaXplKQAAAAANcHVibGljX2Ftb3VudAAAAAAAAAwAAAArTWVya2xlIHJvb3QgdGhlIHByb29mIHdhcyBnZW5lcmF0ZWQgYWdhaW5zdAAAAAAEcm9vdAAAAAw=",
        "AAAAAQAAAQtVc2VyIGFjY291bnQgcmVnaXN0cmF0aW9uIGRhdGEKClVzZWQgZm9yIHJlZ2lzdGVyaW5nIGEgdXNlcidzIHB1YmxpYyBrZXkgdG8gZW5hYmxlIGVuY3J5cHRlZCBjb21tdW5pY2F0aW9uCmZvciByZWNlaXZpbmcgdHJhbnNmZXJzLgpOb3QgcmVxdWlyZWQgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgcG9vbC4gQnV0IGZhY2lsaXRhdGVzIGluLXBvb2wgdHJhbnNmZXJzCnZpYSBldmVudHMuIEFzIHBhcnRpZXMgY2FuIGxlYXJuIGFib3V0IGVhY2ggb3RoZXIgcHVibGljIGtleS4AAAAAAAAAAAdBY2NvdW50AAAAAAMAAAAcT3duZXIgYWRkcmVzcyBvZiB0aGUgYWNjb3VudAAAAAVvd25lcgAAAAAAABMAAACYQmFieUp1Ykp1YiBzcGVuZCBwdWJsaWMga2V5LCBjb21wcmVzc2VkIChpZGVuMyBwYWNrIGZvcm1hdDogMzIgYnl0ZXMgTEUKd2l0aCBiaXQgMjU1ID0gc2lnbiBvZiB4KS4gVXNlZCBmb3IgY3JlYXRpbmcgbm90ZSBjb21taXRtZW50cyBpbiB0aGUgWksgY2lyY3VpdC4AAAAQc3BlbmRfcHVibGljX2tleQAAA+4AAAAgAAAAQFgyNTUxOSB2aWV3IHB1YmxpYyBrZXkgZm9yIEVDREgtZW5jcnlwdGluZyBub3RlIGRhdGEgKDMyIGJ5dGVzKS4AAAAPdmlld19wdWJsaWNfa2V5AAAAA+4AAAAg",
        "AAAAAQAAANlFeHRlcm5hbCBkYXRhIGZvciBhIHRyYW5zYWN0aW9uCgpDb250YWlucyBwdWJsaWMgaW5mb3JtYXRpb24gYWJvdXQgdGhlIHRyYW5zYWN0aW9uIHRoYXQgaXMgaGFzaGVkIGFuZAppbmNsdWRlZCBpbiB0aGUgemVyby1rbm93bGVkZ2UgcHJvb2YgdG8gYmluZCB0aGUgcHJvb2YgdG8gc3BlY2lmaWMKdHJhbnNhY3Rpb24gcGFyYW1ldGVycyAoZS5nLiByZWNpcGllbnQgYWRkcmVzcykuAAAAAAAAAAAAAAdFeHREYXRhAAAAAAQAAAAoRW5jcnlwdGVkIGRhdGEgZm9yIHRoZSBmaXJzdCBvdXRwdXQgVVRYTwAAABFlbmNyeXB0ZWRfb3V0cHV0MAAAAAAAAA4AAAApRW5jcnlwdGVkIGRhdGEgZm9yIHRoZSBzZWNvbmQgb3V0cHV0IFVUWE8AAAAAAAARZW5jcnlwdGVkX291dHB1dDEAAAAAAAAOAAAAQEV4dGVybmFsIGFtb3VudDogcG9zaXRpdmUgZm9yIGRlcG9zaXRzLCBuZWdhdGl2ZSBmb3Igd2l0aGRyYXdhbHMAAAAKZXh0X2Ftb3VudAAAAAAADQAAACFSZWNpcGllbnQgYWRkcmVzcyBmb3Igd2l0aGRyYXdhbHMAAAAAAAAJcmVjaXBpZW50AAAAAAAAEw==",
        "AAAABAAAADhFcnJvcnMgdGhhdCBjYW4gb2NjdXIgZHVyaW5nIEdyb3RoMTYgcHJvb2YgdmVyaWZpY2F0aW9uLgAAAAAAAAAMR3JvdGgxNkVycm9yAAAAAwAAACtUaGUgcGFpcmluZyBwcm9kdWN0IGRpZCBub3QgZXF1YWwgaWRlbnRpdHkuAAAAAAxJbnZhbGlkUHJvb2YAAAAAAAAAPVRoZSBwdWJsaWMgaW5wdXRzIGxlbmd0aCBkb2VzIG5vdCBtYXRjaCB0aGUgdmVyaWZpY2F0aW9uIGtleS4AAAAAAAAVTWFsZm9ybWVkUHVibGljSW5wdXRzAAAAAAAAAQAAAB5UaGUgcHJvb2YgYnl0ZXMgYXJlIG1hbGZvcm1lZC4AAAAAAA5NYWxmb3JtZWRQcm9vZgAAAAAAAg==",
        "AAAAAQAAAGpHcm90aDE2IHByb29mIGNvbXBvc2VkIG9mIHBvaW50cyBBLCBCLCBhbmQgQy4KRzIgcG9pbnQgQiB1c2VzIFNvcm9iYW4ncyBjMXx8YzAgKGltYWdpbmFyeXx8cmVhbCkgb3JkZXJpbmcuAAAAAAAAAAAADEdyb3RoMTZQcm9vZgAAAAMAAAAHUG9pbnQgQQAAAAABYQAAAAAAA+4AAABAAAAAB1BvaW50IEIAAAAAAWIAAAAAAAPuAAAAgAAAAAdQb2ludCBDAAAAAAFjAAAAAAAD7gAAAEA=",
        "AAAAAQAAAHhHcm90aDE2IHZlcmlmaWNhdGlvbiBrZXkgZm9yIEJOMjU0IGN1cnZlIChieXRlLW9yaWVudGVkKS4KQWxsIEcyIHBvaW50cyB1c2UgU29yb2JhbidzIGMxfHxjMCAoaW1hZ2luYXJ5fHxyZWFsKSBvcmRlcmluZy4AAAAAAAAAFFZlcmlmaWNhdGlvbktleUJ5dGVzAAAABQAAAA5BbHBoYSBHMSBwb2ludAAAAAAABWFscGhhAAAAAAAD7gAAAEAAAAANQmV0YSBHMiBwb2ludAAAAAAAAARiZXRhAAAD7gAAAIAAAAAORGVsdGEgRzIgcG9pbnQAAAAAAAVkZWx0YQAAAAAAA+4AAACAAAAADkdhbW1hIEcyIHBvaW50AAAAAAAFZ2FtbWEAAAAAAAPuAAAAgAAAAB1JQyAocHVibGljIGlucHV0IGNvbW1pdG1lbnRzKQAAAAAAAAJpYwAAAAAD6gAAA+4AAABA",
        "AAAAAAAAAAAAAAAHYXBwcm92ZQAAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAHYmFsYW5jZQAAAAABAAAAAAAAAAJpZAAAAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAAIdHJhbnNmZXIAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAAAAAAAJYWxsb3dhbmNlAAAAAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAANdHJhbnNmZXJfZnJvbQAAAAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAJ0bwAAAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==" ]),
      options
    )
  }
  public readonly fromJSON = {
    hello: this.txFromJSON<Array<string>>,
        get_root: this.txFromJSON<Result<u256>>,
        register: this.txFromJSON<null>,
        transact: this.txFromJSON<Result<void>>,
        update_admin: this.txFromJSON<Result<void>>,
        approve: this.txFromJSON<null>,
        balance: this.txFromJSON<i128>,
        transfer: this.txFromJSON<null>,
        allowance: this.txFromJSON<i128>,
        transfer_from: this.txFromJSON<null>
  }
}