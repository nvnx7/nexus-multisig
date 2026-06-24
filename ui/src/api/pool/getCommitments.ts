import { scValToNative } from "@stellar/stellar-sdk";
import { getRpcServer } from "@/api/rpc";
import { POOL_CONTRACT_ID_LOCAL } from "@/config/constants";

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
export async function getCommitments(
  startLedger = 1,
): Promise<CommitmentRecord[]> {
  if (!POOL_CONTRACT_ID_LOCAL)
    throw new Error(
      "POOL_CONTRACT_ID not configured (see src/config/constants.ts)",
    );

  const server = getRpcServer();
  const response = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [POOL_CONTRACT_ID_LOCAL] }],
    limit: 10_000,
  });

  const records: CommitmentRecord[] = [];

  for (const ev of response.events) {
    // contractevent topics: [<event-name symbol>, ...#[topic] fields].
    // NewCommitmentEvent → [symbol("new_commitment_event"), commitment];
    // value = { index, encrypted_output }.
    if (ev.topic.length < 2) continue;

    let name: string;
    let commitment: bigint;
    try {
      name = String(scValToNative(ev.topic[0]!));
      commitment = scValToNative(ev.topic[1]!) as bigint;
    } catch {
      continue;
    }
    if (name !== "new_commitment_event") continue;

    const data = scValToNative(ev.value) as Record<string, unknown> | null;
    if (!data || !("index" in data)) continue;

    records.push({
      commitment: commitment.toString(),
      index: Number(data.index),
      ledger: ev.ledger,
    });
  }

  return records.sort((a, b) => a.index - b.index);
}
