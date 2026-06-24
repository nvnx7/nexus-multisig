import coordinatorClient from "@/api/coordinator";

export type GroupSummary = {
  id: string;
  threshold: number;
  total: number;
  agg_address: string;
  created_at: number;
};

export async function getGroups(params?: {
  address?: string;
  agg_address?: string;
}): Promise<GroupSummary[]> {
  const query = new URLSearchParams();
  if (params?.address) query.set("address", params.address);
  if (params?.agg_address) query.set("agg_address", params.agg_address);

  const { data } = await coordinatorClient.get<{ groups: GroupSummary[] }>(
    `groups${query.size ? `?${query}` : ""}`,
  );
  return data.groups;
}
