import { useQuery } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export type GroupDetail = {
  id: string;
  threshold: number;
  total: number;
  members: { address: string; pubkey: [string, string] }[];
  group_address: string;
  group_pubkey: [string, string];
  enc_pubkey: [string, string] | null;
  /** Common view key, ECIES-encrypted per member: { [address]: blob }. */
  group_view_key: Record<string, string>;
  dkg_session_id: string | null;
  created_at: number;
};

export async function getGroup(id: string): Promise<GroupDetail> {
  const { data } = await coordinatorClient.get<{ group: GroupDetail }>(
    `groups/${id}`,
  );
  return data.group;
}

export function useGetGroup(id: string | undefined) {
  return useQuery({
    queryKey: ["group", id],
    queryFn: () => getGroup(id!),
    enabled: !!id,
  });
}
