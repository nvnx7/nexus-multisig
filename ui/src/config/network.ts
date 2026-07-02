import { POOL_CONTRACT_ID_LOCAL } from "./constants";
import {
  apiUrlCoordinator,
  horizonUrlLocal,
  horizonUrlTestnet,
  passphraseLocalNetwork,
  passphraseTestnetNetwork,
  rpcUrlLocal,
  rpcUrlTestnet,
  network,
} from "./env";

export type NetworkConfig = {
  rpcUrl: string;
  horizonUrl: string;
  passphrase: string;
  coordinatorApiUrl: string;
  poolContractId: string;
};

export type NetworkType = "local" | "testnet";

const localNetworkConfig: NetworkConfig = {
  rpcUrl: rpcUrlLocal,
  horizonUrl: horizonUrlLocal,
  passphrase: passphraseLocalNetwork,
  coordinatorApiUrl: apiUrlCoordinator,
  poolContractId: POOL_CONTRACT_ID_LOCAL,
};

const testnetNetworkConfig: NetworkConfig = {
  rpcUrl: rpcUrlTestnet,
  horizonUrl: horizonUrlTestnet,
  passphrase: passphraseTestnetNetwork,
  coordinatorApiUrl: apiUrlCoordinator,
  poolContractId: "",
};

const networkConfigs: Record<NetworkType, NetworkConfig> = {
  local: localNetworkConfig,
  testnet: testnetNetworkConfig,
};

export const networkConfig = networkConfigs[network];
