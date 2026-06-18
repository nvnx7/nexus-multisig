/**
 * Client-side spend proof generation and pool.transact() transaction builder.
 *
 * Flow:
 *   1. Generate Groth16 proof with snarkjs using artifacts in /public/
 *   2. Encode proof + ext_data as XDR ScVals for the Soroban pool.transact() call
 *   3. Return assembled transaction XDR; caller signs via wallet kit and submits
 */

// snarkjs ships no .d.ts — import as any
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { groth16 } = require("snarkjs") as { groth16: {
  fullProve(input: Record<string, unknown>, wasmPath: string, zkeyPath: string): Promise<{
    proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] };
    publicSignals: string[];
  }>;
} };

import {
  Address,
  Contract,
  Networks,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Server, Api, assembleTransaction } from "@stellar/stellar-sdk/rpc";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";
const POOL_CONTRACT_ID = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID!;
const NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

// ── Types ──────────────────────────────────────────────────────────────────

export type SpendInput = {
  root: bigint;
  nullifiers: bigint[];
  output_commitments: bigint[];
  public_amount: bigint;
  /** Hex-encoded 32-byte hash */
  ext_data_hash: string;
  asp_membership_root: bigint;
  asp_non_membership_root: bigint;
  // private circuit inputs (consumed only by snarkjs, not sent on-chain)
  input_amounts: bigint[];
  input_pubkeys: { x: bigint; y: bigint }[];
  input_salts: bigint[];
  output_amounts: bigint[];
  output_pubkeys: { x: bigint; y: bigint }[];
  output_salts: bigint[];
  path_elements: bigint[][];
  path_indices: bigint[][];
  sig_R8x: bigint;
  sig_R8y: bigint;
  sig_e: bigint;
  sig_s: bigint;
  agg_pubkey: { x: bigint; y: bigint };
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

/** Encode a snarkjs G1 point ([x_dec, y_dec, "1"]) → 64 bytes (x||y BE). */
function encodeG1(pt: string[]): Buffer {
  const buf = new Uint8Array(64);
  writeBE32(BigInt(pt[0]!), buf, 0);
  writeBE32(BigInt(pt[1]!), buf, 32);
  return Buffer.from(buf);
}

/**
 * Encode a snarkjs G2 point ([[x_c0, x_c1], [y_c0, y_c1], ...]) → 128 bytes.
 * snarkjs uses [real(c0), imaginary(c1)]; Soroban stores imaginary(c1)||real(c0).
 */
function encodeG2(pt: string[][]): Buffer {
  const buf = new Uint8Array(128);
  writeBE32(BigInt(pt[0]![1]!), buf, 0);   // x imaginary (c1)
  writeBE32(BigInt(pt[0]![0]!), buf, 32);  // x real      (c0)
  writeBE32(BigInt(pt[1]![1]!), buf, 64);  // y imaginary (c1)
  writeBE32(BigInt(pt[1]![0]!), buf, 96);  // y real      (c0)
  return Buffer.from(buf);
}

// ── XDR helpers ─────────────────────────────────────────────────────────────

function u64(n: bigint): xdr.Uint64 {
  return xdr.Uint64.fromString(n.toString());
}

function u256ScVal(n: bigint): xdr.ScVal {
  const hex = n.toString(16).padStart(64, "0");
  return xdr.ScVal.scvU256(
    new xdr.UInt256Parts({
      hiHi: u64(BigInt("0x" + hex.slice(0, 16))),
      hiLo: u64(BigInt("0x" + hex.slice(16, 32))),
      loHi: u64(BigInt("0x" + hex.slice(32, 48))),
      loLo: u64(BigInt("0x" + hex.slice(48, 64))),
    }),
  );
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

function structScVal(fields: [string, xdr.ScVal][]): xdr.ScVal {
  return xdr.ScVal.scvMap(
    fields.map(
      ([key, val]) =>
        new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(key), val }),
    ),
  );
}

function vecScVal(items: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(items);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a Groth16 spend proof and build an unsigned pool.transact() transaction.
 *
 * @param senderAddress - Stellar address of the sender (must authorize the TX)
 * @param input         - Spend witness (public + private circuit inputs)
 * @param extData       - On-chain data (recipient, amounts, encrypted outputs)
 * @returns Assembled transaction XDR; sign with wallet kit, then submit
 */
export async function buildTransactTx(
  senderAddress: string,
  input: SpendInput,
  extData: ExtData,
): Promise<string> {
  // 1. Generate ZK proof from circuit artifacts in /public/
  const { proof } = await groth16.fullProve(
    input as unknown as Record<string, unknown>,
    "/main.wasm",
    "/main.zkey",
  );

  // 2. Encode proof: A(G1, 64B) || B(G2, 128B) || C(G1, 64B)
  const piA = encodeG1(proof.pi_a);
  const piB = encodeG2(proof.pi_b);
  const piC = encodeG1(proof.pi_c);

  // 3. Build XDR args for pool.transact(proof, ext_data, sender)
  const groth16ProofScVal = structScVal([
    ["a", bytesScVal(piA)],
    ["b", bytesScVal(piB)],
    ["c", bytesScVal(piC)],
  ]);

  const proofScVal = structScVal([
    ["proof", groth16ProofScVal],
    ["root", u256ScVal(input.root)],
    ["input_nullifiers", vecScVal(input.nullifiers.map(u256ScVal))],
    ["output_commitment0", u256ScVal(input.output_commitments[0]!)],
    ["output_commitment1", u256ScVal(input.output_commitments[1]!)],
    ["public_amount", u256ScVal(input.public_amount)],
    ["ext_data_hash", bytesScVal(hexToBuffer(input.ext_data_hash))],
    ["asp_membership_root", u256ScVal(input.asp_membership_root)],
    ["asp_non_membership_root", u256ScVal(input.asp_non_membership_root)],
  ]);

  const extDataScVal = structScVal([
    ["recipient", new Address(extData.recipient).toScVal()],
    ["ext_amount", i256ScVal(extData.ext_amount)],
    ["encrypted_output0", bytesScVal(hexToBuffer(extData.encrypted_output0))],
    ["encrypted_output1", bytesScVal(hexToBuffer(extData.encrypted_output1))],
  ]);

  const senderScVal = new Address(senderAddress).toScVal();

  // 4. Build transaction, simulate to obtain the read/write footprint, assemble
  const server = new Server(RPC_URL);
  const contract = new Contract(POOL_CONTRACT_ID);
  const sourceAccount = await server.getAccount(senderAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call("transact", proofScVal, extDataScVal, senderScVal))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  // 5. Assemble with footprint — returns unsigned transaction XDR
  return assembleTransaction(tx, sim).build().toEnvelope().toXDR("base64");
}

// ── Utility ──────────────────────────────────────────────────────────────────

function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}
