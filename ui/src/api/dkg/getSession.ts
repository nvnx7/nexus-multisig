import client from "@/api/client";

export type DkgSessionDetail = {
  id: string;
  threshold: number;
  total: number;
  status: "round1" | "round2" | "complete";
  group_id: string | null;
  participants: { address: string; participant_index: number }[];
  round1_count: number;
  round2_count: number;
};

export async function getSession(id: string): Promise<DkgSessionDetail> {
  const { data } = await client.get<{ session: DkgSessionDetail }>(`dkg/${id}`);
  return data.session;
}
