/**
 * Shared Soroban RPC helpers for client-side contract calls.
 */

import { Transaction, xdr } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";
import { rpcUrl, passphraseNetwork } from "@/config/env";

/**
 * Soroban RPC client. Allows plain http so the local network endpoint
 * (http://localhost:8000/rpc) works; https (testnet) is unaffected.
 */
export function getRpcServer(): Server {
  return new Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}

/**
 * Sign an unsigned transaction XDR with the connected wallet, submit it, and
 * poll until it confirms. Returns the transaction hash.
 */
export async function signAndSubmit(
  unsignedXdr: string,
  address: string,
): Promise<string> {
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
    address,
    networkPassphrase: passphraseNetwork,
  });

  const server = getRpcServer();
  const signedTx = new Transaction(
    xdr.TransactionEnvelope.fromXDR(signedTxXdr, "base64"),
    passphraseNetwork,
  );

  const sent = await server.sendTransaction(signedTx);
  if (sent.status === "ERROR") {
    throw new Error(`submit failed: ${sent.errorResult?.toXDR("base64")}`);
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const result = await server.getTransaction(sent.hash);
    if (result.status === "SUCCESS") return sent.hash;
    if (result.status === "FAILED") {
      throw new Error("transaction failed on-chain");
    }
    // NOT_FOUND → still pending, keep polling
  }
  throw new Error("transaction confirmation timed out");
}
