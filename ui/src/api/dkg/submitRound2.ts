import client from "@/api/client";

export type Round2Share = {
  recipient_index: number;
  R: [string, string] | null;
  ciphertext: string;
};

export async function submitRound2(
  sessionId: string,
  senderAddress: string,
  shares: Round2Share[],
  encKeyShares?: Round2Share[],
): Promise<void> {
  await client.post(`dkg/${sessionId}/round2`, {
    sender_address: senderAddress,
    shares,
    enc_key_shares: encKeyShares,
  });
}
