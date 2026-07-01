import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SerializedNonceCommitments } from "nexus-crypto";
import coordinatorClient from "@/api/coordinator";

export async function submitCommit(
  sessionId: string,
  params: {
    address: string;
    nonce_commitment: SerializedNonceCommitments;
    enc_nonces: string;
  },
): Promise<{ status: string; nonce_commitment_count: number }> {
  const { data } = await coordinatorClient.post(
    `sign-sessions/${sessionId}/commits`,
    params,
  );
  return data;
}

export function useSubmitCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      sessionId: string;
      address: string;
      nonce_commitment: SerializedNonceCommitments;
      enc_nonces: string;
    }) =>
      submitCommit(vars.sessionId, {
        address: vars.address,
        nonce_commitment: vars.nonce_commitment,
        enc_nonces: vars.enc_nonces,
      }),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ["sign-session", vars.sessionId] }),
  });
}
