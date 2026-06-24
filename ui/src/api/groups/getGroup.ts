import coordinatorClient from "@/api/coordinator";

export type GroupDetail = {
  id: string;
  threshold: number;
  total: number;
  members: { address: string; pubkey: [string, string] }[];
  agg_address: string;
  group_pubkey: [string, string];
  enc_pubkey: [string, string] | null;
  dkg_session_id: string | null;
  created_at: number;
};

export async function getGroup(id: string): Promise<GroupDetail> {
  const { data } = await coordinatorClient.get<{ group: GroupDetail }>(
    `groups/${id}`,
  );
  return data.group;
}
