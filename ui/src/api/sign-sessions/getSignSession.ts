import { useQuery } from "@tanstack/react-query";
import type { SerializedNonceCommitments } from "nexus-crypto";
import coordinatorClient from "@/api/coordinator";
import type { TxProposal } from "./createSignSession";

export type SignSessionDetail = {
  id: string;
  group_address: string;
  proposer: string;
  tx: TxProposal;
  threshold: number;
  status: "collecting_commits" | "collecting_shares" | "complete";
  nonce_commitments: Record<string, SerializedNonceCommitments>;
  /** Each committer's nonces, ECIES-encrypted to their own view key. */
  enc_nonces: Record<string, string>;
  shares: Record<string, string>;
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

export function useGetSignSession(id: string | undefined) {
  return useQuery({
    queryKey: ["sign-session", id],
    queryFn: () => getSignSession(id!),
    enabled: !!id,
  });
}
