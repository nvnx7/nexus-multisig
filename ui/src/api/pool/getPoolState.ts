import {
  Account,
  Contract,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";
import { Api } from "@stellar/stellar-sdk/rpc";
import { getRpcServer } from "@/api/rpc";
import { passphraseNetwork } from "@/config/env";
import {
  POOL_CONTRACT_ID_LOCAL,
  DUMMY_SOURCE_ACCOUNT,
} from "@/config/constants";

export type PoolState = {
  root: string;
};

/**
 * Read the current Merkle root from the pool contract by simulating get_root()
 * directly against the Stellar RPC (no server route).
 */
export async function getPoolState(): Promise<PoolState> {
  if (!POOL_CONTRACT_ID_LOCAL)
    throw new Error(
      "POOL_CONTRACT_ID not configured (see src/config/constants.ts)",
    );

  const server = getRpcServer();
  const contract = new Contract(POOL_CONTRACT_ID_LOCAL);
  const source = new Account(DUMMY_SOURCE_ACCOUNT, "0");

  const tx = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: passphraseNetwork,
  })
    .addOperation(contract.call("get_root"))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const retval = (sim as Api.SimulateTransactionSuccessResponse).result?.retval;
  if (!retval) throw new Error("get_root returned no value");

  const root = scValToNative(retval) as bigint;
  return { root: root.toString() };
}
