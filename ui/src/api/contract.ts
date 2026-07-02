import { Client } from "bindings";
import { StellarWalletsKit } from "@creit-tech/stellar-wallets-kit";
import { networkConfig } from "@/config/network";

export function getPoolClient(publicKey?: string, sign = false): Client {
  const { passphrase, poolContractId, rpcUrl } = networkConfig;
  if (!poolContractId) {
    throw new Error(
      "pool contract ID is not configured for the current network.",
    );
  }

  return new Client({
    contractId: poolContractId,
    rpcUrl,
    networkPassphrase: passphrase,
    allowHttp: rpcUrl.startsWith("http://"),
    publicKey,
    signTransaction:
      sign && publicKey
        ? (xdr) =>
            StellarWalletsKit.signTransaction(xdr, {
              address: publicKey,
              networkPassphrase: passphrase,
            })
        : undefined,
  });
}
