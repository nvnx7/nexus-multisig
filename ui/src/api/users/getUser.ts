import client, { ApiError } from "@/api/client";

export type UserData = {
  address: string;
  pubkey_x: string;
  pubkey_y: string;
  enc_key: string;
};

export async function getUser(address: string): Promise<UserData | null> {
  try {
    const { data } = await client.get<{ user: UserData }>(`users/${encodeURIComponent(address)}`);
    return data.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
