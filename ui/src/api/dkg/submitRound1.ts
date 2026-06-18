import client from "@/api/client";

export async function submitRound1(
  sessionId: string,
  address: string,
  commitments: [string, string][],
): Promise<void> {
  await client.post(`dkg/${sessionId}/round1`, { address, commitments });
}
