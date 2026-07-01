/**
 * Client-side transaction proof generation and pool.transact() builder.
 *
 * Flow:
 *   1. Generate Groth16 proof with snarkjs using artifacts in /public/
 *   2. Encode proof + ext_data as XDR ScVals for the Soroban pool.transact() call
 *   3. Return assembled transaction XDR; caller signs via wallet kit and submits
 */

import { generateSnarkProof } from "nexus-crypto";
import { Address, TransactionBuilder, xdr } from "@stellar/stellar-sdk";
import { keccak_256 } from "@noble/hashes/sha3.js";
import type { Proof, ExtData as ContractExtData } from "bindings";
import { getPoolClient } from "@/api/contract";
import { BN254_FIELD } from "@/config/constants";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Witness for the Transact circuit. Field names and shapes mirror the circuit's
 * input signals exactly (see circuits/src/transact-input.ts) — this object is
 * passed straight to snarkjs `groth16.fullProve`, so any mismatch produces an
 * invalid witness. It must contain exactly the circuit inputs and nothing else.
 */
export type TransactInput = {
  // public — same order the pool contract feeds the on-chain verifier:
  //   [root, public_amount, ext_data_hash, nullifiers, output_commitments]
  root: bigint;
  public_amount: bigint;
  /** Field element = keccak256(xdr(ext_data)) mod BN254 scalar field. */
  ext_data_hash: bigint;
  nullifiers: bigint[];
  output_commitments: bigint[];
  // private — FROST aggregate public key (x, y)
  agg_pubkey: [bigint, bigint];
  // private — per input note
  amounts: bigint[];
  salts: bigint[];
  note_indices: bigint[];
  path_elements: bigint[][];
  path_indices: bigint[][];
  // private — output notes (2 outputs); output_pubkeys[j] = [x, y]
  output_pubkeys: [[bigint, bigint], [bigint, bigint]];
  output_amounts: bigint[];
  output_salts: bigint[];
  // private — FROST Schnorr signature
  sig_s: bigint;
  sig_e: bigint;
};

export type ExtData = {
  /** Stellar address of the withdrawal recipient */
  recipient: string;
  /** Positive = deposit, negative = withdrawal (in stroops) */
  ext_amount: bigint;
  /** Hex-encoded encrypted output for note 0 */
  encrypted_output0: string;
  /** Hex-encoded encrypted output for note 1 */
  encrypted_output1: string;
};

// ── Proof encoding ───────────────────────────────────────────────────────────

function writeBE32(n: bigint, buf: Uint8Array, offset: number): void {
  for (let i = 31; i >= 0; i--) {
    buf[offset + i] = Number(n & 0xffn);
    n >>= 8n;
  }
}

function encodeG1(pt: [bigint, bigint]): Buffer {
  const buf = new Uint8Array(64);
  writeBE32(pt[0], buf, 0);
  writeBE32(pt[1], buf, 32);
  return Buffer.from(buf);
}

// snarkjs uses [real(c0), imaginary(c1)]; Soroban stores imaginary(c1)||real(c0).
function encodeG2(pt: [[bigint, bigint], [bigint, bigint]]): Buffer {
  const buf = new Uint8Array(128);
  writeBE32(pt[0][1], buf, 0); // x imaginary (c1)
  writeBE32(pt[0][0], buf, 32); // x real      (c0)
  writeBE32(pt[1][1], buf, 64); // y imaginary (c1)
  writeBE32(pt[1][0], buf, 96); // y real      (c0)
  return Buffer.from(buf);
}

// ── XDR helpers ─────────────────────────────────────────────────────────────

function u64(n: bigint): xdr.Uint64 {
  return xdr.Uint64.fromString(n.toString());
}

function i256ScVal(n: bigint): xdr.ScVal {
  // Two's complement representation in 256 bits
  const BITS = 256n;
  const twos = ((n % (1n << BITS)) + (1n << BITS)) % (1n << BITS);
  const hex = twos.toString(16).padStart(64, "0");
  const hiHiBig = BigInt("0x" + hex.slice(0, 16));
  return xdr.ScVal.scvI256(
    new xdr.Int256Parts({
      // hiHi is signed: reinterpret as signed 64-bit if high bit is set
      hiHi: xdr.Int64.fromString(BigInt.asIntN(64, hiHiBig).toString()),
      hiLo: u64(BigInt("0x" + hex.slice(16, 32))),
      loHi: u64(BigInt("0x" + hex.slice(32, 48))),
      loLo: u64(BigInt("0x" + hex.slice(48, 64))),
    }),
  );
}

function bytesScVal(buf: Buffer): xdr.ScVal {
  return xdr.ScVal.scvBytes(buf);
}

// Soroban contracttype structs are ScVal maps whose entries MUST be sorted by
// key (symbols compared bytewise). Sort here so callers can list fields in any
// order and the host still accepts the map and produces matching XDR.
function structScVal(fields: [string, xdr.ScVal][]): xdr.ScVal {
  const sorted = [...fields].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return xdr.ScVal.scvMap(
    sorted.map(
      ([key, val]) =>
        new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val }),
    ),
  );
}

/** Encode a field element as a 32-byte big-endian buffer. */
function field32(n: bigint): Buffer {
  const buf = new Uint8Array(32);
  writeBE32(n, buf, 0);
  return Buffer.from(buf);
}

/** Build the canonical ScVal map for ExtData (sorted keys; matches the contract). */
function buildExtDataScVal(extData: ExtData): xdr.ScVal {
  return structScVal([
    ["recipient", new Address(extData.recipient).toScVal()],
    ["ext_amount", i256ScVal(extData.ext_amount)],
    ["encrypted_output0", bytesScVal(hexToBuffer(extData.encrypted_output0))],
    ["encrypted_output1", bytesScVal(hexToBuffer(extData.encrypted_output1))],
  ]);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute `ext_data_hash` exactly as the pool contract does:
 */
export function computeExtDataHash(extData: ExtData): bigint {
  const payload = buildExtDataScVal(extData).toXDR(); // canonical XDR bytes
  const digest = keccak_256(payload); // Uint8Array(32)
  let n = 0n;
  for (const b of digest) n = (n << 8n) | BigInt(b);
  return n % BN254_FIELD;
}

/**
 * Generate a Groth16 transaction proof and build an unsigned pool.transact() call.
 *
 * @param senderAddress - Stellar address of the sender (must authorize the TX)
 * @param input         - Transact witness (public + private circuit inputs)
 * @param extData       - On-chain data (recipient, amounts, encrypted outputs)
 * @returns Assembled transaction XDR; sign with wallet kit, then submit
 */
export async function buildTransactTx(
  senderAddress: string,
  input: TransactInput,
  extData: ExtData,
) {
  const extDataHash = computeExtDataHash(extData);
  if (extDataHash !== input.ext_data_hash) {
    throw new Error(
      "ext_data_hash mismatch: witness/signature do not match the provided extData",
    );
  }

  // Generate proof
  const snarkJs = (globalThis as any).snarkjs;
  if (!snarkJs) throw new Error("snarkjs not found on globalThis");
  const { proof } = await generateSnarkProof({
    snarkJs,
    inputs: input as any,
    circuit: { wasm: "/main.wasm", zkey: "/main.zkey" },
  });

  // 2. Assemble the typed contract arguments. The bindings encode these to XDR
  //    (matching the contract's struct layout); we only encode the Groth16
  //    proof points (A: G1 64B, B: G2 128B, C: G1 64B) and the field elements.
  const proofArg: Proof = {
    proof: {
      a: encodeG1(proof.a),
      b: encodeG2(proof.b),
      c: encodeG1(proof.c),
    },
    root: input.root,
    input_nullifiers: input.nullifiers,
    output_commitment0: input.output_commitments[0]!,
    output_commitment1: input.output_commitments[1]!,
    public_amount: input.public_amount,
    // 32-byte big-endian of the reduced field element (matches the contract).
    ext_data_hash: field32(extDataHash),
  };

  const extDataArg: ContractExtData = {
    recipient: extData.recipient,
    ext_amount: extData.ext_amount,
    encrypted_output0: hexToBuffer(extData.encrypted_output0),
    encrypted_output1: hexToBuffer(extData.encrypted_output1),
  };

  // 3. Build + simulate via the bindings client. Return the assembled (prepared)
  //    XDR so the caller can sign it with the wallet and submit (see useTransact).
  const client = getPoolClient(senderAddress, true);
  const tx = await client.transact({
    proof: proofArg,
    ext_data: extDataArg,
    sender: senderAddress,
  });
  return tx;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}
