import { useQuery } from "@tanstack/react-query";
import { scValToNative } from "@stellar/stellar-sdk";
import { getRpcServer, getEarliestLedger } from "@/api/rpc";
import { POOL_CONTRACT_ID_LOCAL } from "@/config/constants";
import { getCommitments } from "./getCommitments";
import type { GroupDetail } from "@/api/groups/getGroup";
import { Note } from "nexus-crypto";

/** Set of nullifiers already spent on-chain (from NewNullifierEvent). */
async function getSpentNullifiers(startLedger: number): Promise<Set<string>> {
  const server = getRpcServer();
  const res = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [POOL_CONTRACT_ID_LOCAL] }],
    limit: 10_000,
  });
  const spent = new Set<string>();
  for (const ev of res.events) {
    if (ev.topic.length < 2) continue;
    try {
      if (String(scValToNative(ev.topic[0]!)) !== "new_nullifier_event") continue;
      spent.add((scValToNative(ev.topic[1]!) as bigint).toString());
    } catch {
      continue;
    }
  }
  return spent;
}

/**
 * All unspent notes owned by a group: scans commitments, ECIES-decrypts each
 * encrypted output with the group view key, keeps the ones that decrypt and whose
 * commitment matches, and drops any whose nullifier is already on-chain.
 */
export async function getGroupNotes(params: {
  group: GroupDetail;
  gvk: bigint;
  startLedger?: number;
}): Promise<Note[]> {
  const { group, gvk, startLedger } = params;
  const ownerPubkey = {
    x: BigInt(group.group_pubkey[0]),
    y: BigInt(group.group_pubkey[1]),
  };

  const ledger = startLedger ?? await getEarliestLedger(getRpcServer());
  const [commitments, spent] = await Promise.all([
    getCommitments(ledger),
    getSpentNullifiers(ledger),
  ]);

  const owned: Note[] = [];
  for (const rec of commitments) {
    if (!rec.encrypted_output) continue;
    const note = Note.decrypt(rec.encrypted_output, gvk, ownerPubkey);
    if (!note || note.commitment() !== BigInt(rec.commitment)) continue;
    const nullifier = note.nullifier(BigInt(rec.index));
    if (spent.has(nullifier.toString())) continue;
    note.index = rec.index;
    owned.push(note);
  }
  return owned;
}

export function useGetGroupNotes(params: {
  group: GroupDetail | undefined;
  gvk: bigint | null;
}) {
  const { group, gvk } = params;
  return useQuery({
    queryKey: ["group-notes", group?.group_address, gvk?.toString()],
    queryFn: () => getGroupNotes({ group: group!, gvk: gvk! }),
    enabled: !!group && gvk != null,
  });
}
