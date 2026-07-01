import { useMutation, useQueryClient } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export async function submitSigShare(
  sessionId: string,
  params: { address: string; sig_share: string },
): Promise<{ status: string; sig_share_count: number }> {
  const { data } = await coordinatorClient.post(
    `sign-sessions/${sessionId}/sig-shares`,
    params,
  );
  return data;
}

export function useSubmitSigShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string; address: string; sig_share: string }) =>
      submitSigShare(vars.sessionId, { address: vars.address, sig_share: vars.sig_share }),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ["sign-session", vars.sessionId] }),
  });
}
