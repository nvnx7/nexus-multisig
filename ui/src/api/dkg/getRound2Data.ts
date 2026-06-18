import client from "@/api/client";

export type EncKeyShare = {
  R: [string, string] | null;
  ciphertext: string;
};

export type Round2DataResult =
  | { ready: false; senders_done: number; total: number }
  | {
      ready: true;
      recipient_index: number;
      shares: { sender_index: number; R: [string, string] | null; ciphertext: string }[];
      enc_key_share: EncKeyShare | null;
    };

export async function getRound2Data(
  sessionId: string,
  address: string,
): Promise<Round2DataResult> {
  const { data } = await client.get<Round2DataResult>(
    `dkg/${sessionId}/round2?address=${encodeURIComponent(address)}`,
  );
  return data;
}
