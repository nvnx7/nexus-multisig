import { useMutation, useQueryClient } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export async function submitSignature(
  sessionId: string,
  params: { s: string; e: string },
): Promise<{ status: string }> {
  const { data } = await coordinatorClient.post(
    `sign-sessions/${sessionId}/signature`,
    params,
  );
  return data;
}

export function useSubmitSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string; s: string; e: string }) =>
      submitSignature(vars.sessionId, { s: vars.s, e: vars.e }),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: ["sign-session", vars.sessionId] }),
  });
}
