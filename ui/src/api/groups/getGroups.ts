import { useQuery } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export type GroupSummary = {
  id: string;
  threshold: number;
  total: number;
  group_address: string;
  created_at: number;
};

export async function getGroups(params?: {
  address?: string;
  group_address?: string;
}): Promise<GroupSummary[]> {
  const query = new URLSearchParams();
  if (params?.address) query.set("address", params.address);
  if (params?.group_address) query.set("group_address", params.group_address);

  const { data } = await coordinatorClient.get<{ groups: GroupSummary[] }>(
    `groups${query.size ? `?${query}` : ""}`,
  );
  return data.groups;
}

export function useGetGroups(params?: { address?: string; group_address?: string }) {
  return useQuery({
    queryKey: ["groups", params?.address ?? null, params?.group_address ?? null],
    queryFn: () => getGroups(params),
    enabled: !!(params?.address || params?.group_address),
  });
}
