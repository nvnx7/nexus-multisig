import client from "@/api/client";

export async function registerUser(
  stellarAddress: string,
  spendPublicKey: [string, string],
  viewPublicKey: string,
): Promise<{ address: string }> {
  const { data } = await client.post<{ address: string }>("users", {
    stellar_address: stellarAddress,
    spend_public_key: spendPublicKey,
    view_public_key: viewPublicKey,
  });
  return data;
}
