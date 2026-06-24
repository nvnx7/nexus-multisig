import coordinatorClient from "@/api/coordinator";
import { useQuery } from "@tanstack/react-query";

export type UserDkgSessionSummary = {
  id: string;
  threshold: number;
  status: "round1" | "round2" | "complete";
  group_id: string | null;
  created_at: number;
};

export async function getUserDkgSessions(params: {
  address: string;
}): Promise<UserDkgSessionSummary[]> {
  const { data } = await coordinatorClient.get<{
    sessions: UserDkgSessionSummary[];
  }>("/dkg", {
    params,
  });
  return data.sessions;
}

export function useGetUserDkgSessions(params: { address?: string }) {
  return useQuery({
    queryKey: ["dkg-sessions", params.address],
    queryFn: () => getUserDkgSessions({ address: params.address! }),
    select: (data) => data.filter((s) => s.group_id === null),
    enabled: !!params.address,
  });
}
