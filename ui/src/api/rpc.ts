import { Server } from "@stellar/stellar-sdk/rpc";
import { networkConfig } from "@/config/network";

/**
 * Returns the earliest ledger available from the RPC node.
 * On testnet we estimate (latestLedger - 17,000); on a short-lived local
 * network that undershoots, we read oldestLedger directly from the response.
 */
export async function getEarliestLedger(server: Server): Promise<number> {
  const { sequence: latestLedger } = await server.getLatestLedger();
  const estimated = latestLedger - 17_000;
  if (estimated >= 1) return estimated;
  const probe = await server.getEvents({
    startLedger: latestLedger,
    filters: [],
    limit: 1,
  });
  return probe.oldestLedger;
}

/**
 * Soroban RPC client. Allows plain http so the local network endpoint
 * (http://localhost:8000/rpc) works; https (testnet) is unaffected.
 */
export function getRpcServer(): Server {
  const rpcUrl = networkConfig.rpcUrl;
  return new Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}
