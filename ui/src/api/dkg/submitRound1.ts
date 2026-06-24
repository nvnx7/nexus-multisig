import { useMutation, useQueryClient } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";
import type { SerializedDKGRound1 } from "nexus-crypto";

export async function submitRound1(
  sessionId: string,
  address: string,
  round1Data: SerializedDKGRound1,
): Promise<void> {
  await coordinatorClient.post(`dkg/${sessionId}/round1`, {
    address,
    round1_data: round1Data,
  });
}

export function useSubmitDkgRound1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; address: string; round1Data: SerializedDKGRound1 }) =>
      submitRound1(params.sessionId, params.address, params.round1Data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dkg-session", variables.sessionId] });
    },
  });
}
