import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SerializedNonceCommitments } from "nexus-crypto";
import coordinatorClient from "@/api/coordinator";
import type { TxDetails } from "@/lib/tx/txDetails";

export async function createSignSession(params: {
  group_address: string;
  proposer: string;
  /** The fully-pinned transaction (witness + ext_data). */
  tx_details: TxDetails;
  /** The signing message = deriveTransactMsg(...), as a decimal string. */
  tx_hash: string;
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
