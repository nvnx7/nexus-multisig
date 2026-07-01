import { useQuery } from "@tanstack/react-query";
import type { SerializedNonceCommitments } from "nexus-crypto";
import coordinatorClient from "@/api/coordinator";
import type { TxDetails } from "@/lib/tx/txDetails";
import type { SignSessionStatus } from "./getSignSessions";

export type SignSessionDetail = {
  id: string;
  group_address: string;
  proposer: string;
  tx_details: TxDetails;
  tx_hash: string;
  threshold: number;
  status: SignSessionStatus;
  /** The signer set — committer address → nonce commitment. */
  nonce_commitments: Record<string, SerializedNonceCommitments>;
  /** Each committer's nonces, ECIES-encrypted to their own view key. */
  enc_nonces: Record<string, string>;
  /** signature shares: committer address → z (decimal string). */
  sig_shares: Record<string, string>;
  sig_s: string | null;
  sig_e: string | null;
  created_at: number;
};

export async function getSignSession(id: string): Promise<SignSessionDetail> {
  const { data } = await coordinatorClient.get<{ session: SignSessionDetail }>(
    `sign-sessions/${id}`,
  );
  return data.session;
}

export function useGetSignSession(
  id: string | undefined,
  opts?: { poll?: boolean },
) {
  return useQuery({
    queryKey: ["sign-session", id],
    queryFn: () => getSignSession(id!),
    enabled: !!id,
    refetchInterval: opts?.poll
      ? (q) => (q.state.data?.status !== "complete" ? 2500 : false)
      : false,
  });
}
