import { useMutation, useQueryClient } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export async function createGroup(params: {
  threshold: number;
  members: { address: string; pubkey: [string, string] }[];
  agg_pubkey: [string, string];
  enc_pubkey?: [string, string];
  dkg_session_id?: string;
}): Promise<{ id: string; agg_address: string }> {
  const { data } = await coordinatorClient.post<{
    id: string;
    agg_address: string;
  }>("groups", params);
  return data;
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: (_, variables) => {
      if (variables.dkg_session_id) {
        queryClient.invalidateQueries({ queryKey: ["dkg-session", variables.dkg_session_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
