import { useQuery } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";
import type { TxProposal } from "./createSignSession";

export type SignSessionSummary = {
  id: string;
  group_address: string;
  proposer: string;
  tx: TxProposal;
  threshold: number;
  status: "collecting_commits" | "collecting_shares" | "complete";
  nonce_commitment_count: number;
  created_at: number;
};

export async function getSignSessions(
  group_address: string,
): Promise<SignSessionSummary[]> {
  const { data } = await coordinatorClient.get<{ sessions: SignSessionSummary[] }>(
    `sign-sessions?group_address=${encodeURIComponent(group_address)}`,
  );
  return data.sessions;
}

export function useGetSignSessions(group_address: string | undefined) {
  return useQuery({
    queryKey: ["sign-sessions", group_address],
    queryFn: () => getSignSessions(group_address!),
    enabled: !!group_address,
  });
}
