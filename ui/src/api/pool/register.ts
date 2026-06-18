/**
 * On-chain shielded account registration.
 *
 * Builds a pool.register(account) transaction, requests a signature from the
 * Stellar wallet, and submits it.  The contract emits a PublicKeyEvent that
 * other participants can use to look up the caller's shielded keys by their
 * Stellar address.
 *
 * Must be called client-side because it needs the wallet kit for signing.
 */

import {
  Address,
  Contract,
  Networks,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Server, Api, assembleTransaction } from "@stellar/stellar-sdk/rpc";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";
import { babyJub } from "@iden3/js-crypto";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
  "https://soroban-testnet.stellar.org";
const POOL_CONTRACT_ID = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID;
const NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

/**
 * Register the caller's shielded keys on the pool contract.
 *
 * @param stellarAddress - The connected Stellar wallet address (owner).
 * @param noteKeyX       - BabyJubJub note-key X coordinate (decimal string).
 * @param noteKeyY       - BabyJubJub note-key Y coordinate (decimal string).
 * @param viewPubKey     - X25519 encryption public key (32 bytes hex).
 */
export async function registerOnChain(
  stellarAddress: string,
  noteKeyX: string,
  noteKeyY: string,
  viewPubKey: string,
): Promise<void> {
  if (!POOL_CONTRACT_ID) throw new Error("NEXT_PUBLIC_POOL_CONTRACT_ID not configured");

  // Compress spend key (BJJ point) to 32 bytes using iden3 pack format
  // (y as 32-byte LE with bit 255 = sign of x)
  const spendKeyBytes = Buffer.from(
    babyJub.packPoint([BigInt(noteKeyX), BigInt(noteKeyY)]),
  );
  // View key (X25519) is already 32 bytes
  const viewKeyBytes = hexToBuffer(viewPubKey);

  // Build the Account struct ScVal for pool.register(account)
  // Keys must be in lexicographic order: owner < spend_public_key < view_public_key
  const accountScVal = xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("owner"),
      val: new Address(stellarAddress).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("spend_public_key"),
      val: xdr.ScVal.scvBytes(spendKeyBytes),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("view_public_key"),
      val: xdr.ScVal.scvBytes(viewKeyBytes),
    }),
  ]);

  const server = new Server(RPC_URL);
  const contract = new Contract(POOL_CONTRACT_ID);
  const sourceAccount = await server.getAccount(stellarAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100000",
    networkPassphrase: NETWORK,
  })
    .addOperation(contract.call("register", accountScVal))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const assembled = assembleTransaction(tx, sim).build();
  const txXdr = assembled.toEnvelope().toXDR("base64");

  // Sign via wallet kit (signTransaction = sign without submitting)
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(txXdr, {
    address: stellarAddress,
    networkPassphrase: NETWORK,
  });

  // Submit
  const signedTx = new Transaction(
    xdr.TransactionEnvelope.fromXDR(signedTxXdr, "base64"),
    NETWORK,
  );
  const submitResult = await server.sendTransaction(signedTx);

  if (submitResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${submitResult.errorResult?.toXDR("base64")}`);
  }

  // Poll until the transaction is confirmed
  await waitForConfirmation(server, submitResult.hash);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex.startsWith("0x") ? hex.slice(2) : hex, "hex");
}

async function waitForConfirmation(
  server: Server,
  txHash: string,
  maxAttempts = 20,
  intervalMs = 1500,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(intervalMs);
    const result = await server.getTransaction(txHash);
    if (result.status === "SUCCESS") return;
    if (result.status === "FAILED") {
      throw new Error("Transaction failed on-chain");
    }
    // "NOT_FOUND" = still pending — keep polling
  }
  throw new Error("Transaction confirmation timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
