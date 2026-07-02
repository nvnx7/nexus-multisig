import { POOL_CONTRACT_ID_LOCAL, POOL_CONTRACT_ID_TESTNET } from "./constants";
import {
  apiUrlCoordinatorLocal,
  horizonUrlLocal,
  horizonUrlTestnet,
  passphraseLocalNetwork,
  passphraseTestnetNetwork,
  rpcUrlLocal,
  rpcUrlTestnet,
  network,
  apiUrlCoordinatorTestnet,
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
  coordinatorApiUrl: apiUrlCoordinatorLocal,
  poolContractId: POOL_CONTRACT_ID_LOCAL,
};

const testnetNetworkConfig: NetworkConfig = {
  rpcUrl: rpcUrlTestnet,
  horizonUrl: horizonUrlTestnet,
  passphrase: passphraseTestnetNetwork,
  coordinatorApiUrl: apiUrlCoordinatorTestnet,
  poolContractId: POOL_CONTRACT_ID_TESTNET,
};

const networkConfigs: Record<NetworkType, NetworkConfig> = {
  local: localNetworkConfig,
  testnet: testnetNetworkConfig,
};

export const networkConfig = networkConfigs[network];
