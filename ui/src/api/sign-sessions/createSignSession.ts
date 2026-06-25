import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SerializedNonceCommitments } from "nexus-crypto";
import coordinatorClient from "@/api/coordinator";

/** High-level UTXO transaction proposal. */
export type TxProposal = {
  type: "deposit" | "withdraw" | "transfer";
  amount: string;
  recipient?: string;
};

export async function createSignSession(params: {
  group_address: string;
  proposer: string;
  tx: TxProposal;
  nonce_commitment: SerializedNonceCommitments;
  enc_nonces: string;
}): Promise<{ id: string }> {
  const { data } = await coordinatorClient.post<{ id: string }>(
    "sign-sessions",
    params,
  );
  return data;
}

export function useCreateSignSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSignSession,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["sign-sessions", variables.group_address],
      });
    },
  });
}
