import { Networks } from "@stellar/stellar-sdk";

export const network: "local" | "testnet" =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "local" ? "local" : "testnet";

export const rpcUrlLocal = process.env
  .NEXT_PUBLIC_SOROBAN_RPC_URL_LOCALNET as string;
export const rpcUrlTestnet = process.env
  .NEXT_PUBLIC_SOROBAN_RPC_URL_TESTNET as string;

export const horizonUrlLocal = process.env
  .NEXT_PUBLIC_HORIZON_URL_LOCALNET as string;
export const horizonUrlTestnet = process.env
  .NEXT_PUBLIC_HORIZON_URL_TESTNET as string;

export const isTestnet = network === "testnet";

export const rpcUrl = isTestnet ? rpcUrlTestnet : rpcUrlLocal;

export const passphraseLocalNetwork = Networks.STANDALONE;
export const passphraseTestnetNetwork = Networks.TESTNET;
export const passphraseNetwork = isTestnet
  ? passphraseTestnetNetwork
  : passphraseLocalNetwork;

export const apiUrlCoordinator = process.env
  .NEXT_PUBLIC_COORDINATOR_API_URL as string;
