import { scValToNative } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const POOL_CONTRACT_ID = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID;

export type CommitmentRecord = {
  /** Commitment hash as decimal bigint string */
  commitment: string;
  /** Insertion index in the Merkle tree */
  index: number;
  /** Ledger sequence when the event was emitted */
  ledger: number;
};

/**
 * Fetch NewCommitment events from the pool contract directly via Stellar RPC.
 *
 * Note: the Stellar RPC retains events for ~17,280 ledgers (~24h on testnet).
 * Pass a known deployment ledger as startLedger to scan from contract creation.
 */
export async function getCommitments(startLedger = 1): Promise<CommitmentRecord[]> {
  if (!POOL_CONTRACT_ID) throw new Error("NEXT_PUBLIC_POOL_CONTRACT_ID not configured");

  const server = new Server(RPC_URL);
  const response = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [POOL_CONTRACT_ID] }],
    limit: 10_000,
  });

  const records: CommitmentRecord[] = [];

  for (const ev of response.events) {
    // NewCommitmentEvent: topic=[commitment (U256)], value={index, ...}
    if (ev.topic.length !== 1) continue;

    const data = scValToNative(ev.value) as Record<string, unknown> | null;
    if (!data || !("index" in data)) continue;

    let commitment: bigint;
    try {
      commitment = scValToNative(ev.topic[0]!) as bigint;
    } catch {
      continue;
    }

    records.push({
      commitment: commitment.toString(),
      index: Number(data.index),
      ledger: ev.ledger,
    });
  }

  return records.sort((a, b) => a.index - b.index);
}
