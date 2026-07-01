import { useQuery } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";
import type { TxDetails } from "@/lib/tx/txDetails";

export type SignSessionStatus =
  | "collecting_commits"
  | "collecting_shares"
  | "complete";

export type SignSessionSummary = {
  id: string;
  group_address: string;
  proposer: string;
  tx_details: TxDetails;
  tx_hash: string;
  threshold: number;
  status: SignSessionStatus;
  nonce_commitment_count: number;
  sig_share_count: number;
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
