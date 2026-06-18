import client from "@/api/client";

export type Round1DataResult =
  | { ready: false; round1_received: number; total: number }
  | {
      ready: true;
      round1: { participant_index: number; commitments: [string, string][] }[];
    };

export async function getRound1Data(sessionId: string): Promise<Round1DataResult> {
  const { data } = await client.get<Round1DataResult>(`dkg/${sessionId}/round1`);
  return data;
}
