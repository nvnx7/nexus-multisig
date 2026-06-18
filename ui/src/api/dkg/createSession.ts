import client from "@/api/client";

export type CreateSessionResult = {
  id: string;
  participants: { address: string; participant_index: number }[];
};

export async function createSession(
  threshold: number,
  participants: string[],
): Promise<CreateSessionResult> {
  const { data } = await client.post<CreateSessionResult>("dkg", { threshold, participants });
  return data;
}
