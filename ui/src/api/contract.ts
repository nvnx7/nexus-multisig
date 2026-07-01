/**
 * Pool contract client built from the generated `bindings` package, configured
 * for the active network. Use this instead of hand-encoding contract calls.
 */

import { Client } from "bindings";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";
import { rpcUrl, passphraseNetwork } from "@/config/env";
import { POOL_CONTRACT_ID_LOCAL } from "@/config/constants";

export function getPoolClient(publicKey?: string, sign = false): Client {
  if (!POOL_CONTRACT_ID_LOCAL) {
    throw new Error(
      "POOL_CONTRACT_ID not configured (see src/config/constants.ts)",
    );
  }

  return new Client({
    contractId: POOL_CONTRACT_ID_LOCAL,
    rpcUrl,
    networkPassphrase: passphraseNetwork,
    allowHttp: rpcUrl.startsWith("http://"),
    publicKey,
    signTransaction:
      sign && publicKey
        ? (xdr) =>
            StellarWalletsKit.signTransaction(xdr, {
              address: publicKey,
              networkPassphrase: passphraseNetwork,
            })
        : undefined,
  });
}
