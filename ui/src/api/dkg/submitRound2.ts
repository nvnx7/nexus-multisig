import { useMutation, useQueryClient } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";
import type { SerializedDKGRound2 } from "nexus-crypto";

export async function submitRound2(
  sessionId: string,
  address: string,
  round2Data: SerializedDKGRound2,
): Promise<void> {
  await coordinatorClient.post(`dkg/${sessionId}/round2`, {
    address,
    round2_data: round2Data,
  });
}

export function useSubmitDkgRound2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { sessionId: string; address: string; round2Data: SerializedDKGRound2 }) =>
      submitRound2(params.sessionId, params.address, params.round2Data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dkg-session", variables.sessionId] });
    },
  });
}
