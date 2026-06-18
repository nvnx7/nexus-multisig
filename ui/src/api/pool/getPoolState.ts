import {
  Account,
  Contract,
  Networks,
  TransactionBuilder,
  scValToNative,
} from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const POOL_CONTRACT_ID = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID;
const NETWORK =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
    ? Networks.PUBLIC
    : Networks.TESTNET;

// A well-known testnet address used only as the simulation source account.
// The account does not need to exist — simulation doesn't validate sequence.
const DUMMY_SOURCE = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

export type PoolState = {
  root: string;
};

/**
 * Read the current Merkle root from the pool contract by simulating get_root()
 * directly against the Stellar RPC (no server route).
 */
export async function getPoolState(): Promise<PoolState> {
  if (!POOL_CONTRACT_ID) throw new Error("NEXT_PUBLIC_POOL_CONTRACT_ID not configured");

  const server = new Server(RPC_URL);
  const contract = new Contract(POOL_CONTRACT_ID);
  const source = new Account(DUMMY_SOURCE, "0");

  const tx = new TransactionBuilder(source, {
    fee: "100",
    networkPassphrase: NETWORK,
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
