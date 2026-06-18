import client from "@/api/client";

export type CreateGroupParams = {
  threshold: number;
  members: { address: string; pubkey: [string, string] }[];
  agg_pubkey: [string, string];
  enc_pubkey: [string, string];
  dkg_session_id?: string;
};

export async function createGroup(
  params: CreateGroupParams,
): Promise<{ id: string; agg_address: string }> {
  const { data } = await client.post<{ id: string; agg_address: string }>("groups", params);
  return data;
}
