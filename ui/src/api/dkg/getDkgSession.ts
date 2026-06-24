"use client";

import { useQuery } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export type DkgSessionDetail = {
  id: string;
  threshold: number;
  total: number;
  status: "round1" | "round2" | "complete";
  group_id: string | null;
  creator_address: string;
  participants: { address: string }[];
  round1_count: number;
  round2_count: number;
  round1_data: Record<string, any>;
  round2_data: Record<string, any>;
};

export async function getDkgSession(id: string): Promise<DkgSessionDetail> {
  const { data } = await coordinatorClient.get<{ session: DkgSessionDetail }>(
    `dkg/${id}`,
  );
  return data.session;
}

export function useGetDkgSession(params: { sessionId: string | undefined; poll?: boolean }) {
  return useQuery({
    queryKey: ["dkg-session", params.sessionId],
    queryFn: () => getDkgSession(params.sessionId!),
    enabled: !!params.sessionId,
    refetchInterval: params.poll
      ? (q) => (q.state.data?.status !== "complete" ? 2000 : false)
      : false,
  });
}
