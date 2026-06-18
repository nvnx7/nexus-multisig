import { scValToNative } from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { babyJub } from "@iden3/js-crypto";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const POOL_CONTRACT_ID = process.env.NEXT_PUBLIC_POOL_CONTRACT_ID;

export type PoolPublicKey = {
  /** BabyJubJub spend-key X coordinate (decimal string) */
  note_key_x: string;
  /** BabyJubJub spend-key Y coordinate (decimal string) */
  note_key_y: string;
  /** X25519 view key (32 bytes hex) */
  enc_key: string;
};

/**
 * Scan PublicKeyEvent events from the pool contract directly via Stellar RPC
 * and return the most-recently published key set for the given Stellar address.
 *
 * PublicKeyEvent structure:
 *   topic[0] = owner (Address)
 *   value    = { owner, spend_public_key: bytes(32), view_public_key: bytes(32) }
 *
 * spend_public_key is a BJJ point compressed with babyJub.packPoint (32 bytes LE,
 * bit 255 = sign of x). view_public_key is a raw 32-byte X25519 public key.
 *
 * Returns null if the address has not called pool.register() yet.
 */
export async function getPoolPublicKey(
  stellarAddress: string,
): Promise<PoolPublicKey | null> {
  if (!POOL_CONTRACT_ID) throw new Error("NEXT_PUBLIC_POOL_CONTRACT_ID not configured");

  const server = new Server(RPC_URL);
  const response = await server.getEvents({
    startLedger: 1,
    filters: [{ type: "contract", contractIds: [POOL_CONTRACT_ID] }],
    limit: 500,
  });

  // PublicKeyEvent: topic=[owner (Address)], value={owner, spend_public_key, view_public_key}
  let latest: PoolPublicKey | null = null;

  for (const ev of response.events) {
    if (ev.topic.length !== 1) continue;

    let owner: string;
    try {
      owner = (scValToNative(ev.topic[0]!) as { toString(): string }).toString();
    } catch {
      continue;
    }
    if (owner !== stellarAddress) continue;

    const data = scValToNative(ev.value) as Record<string, unknown> | null;
    if (!data) continue;

    const spendKeyBytes = data.spend_public_key;
    const viewKeyBytes = data.view_public_key;
    if (!(spendKeyBytes instanceof Uint8Array) || !(viewKeyBytes instanceof Uint8Array)) continue;
    if (spendKeyBytes.length !== 32 || viewKeyBytes.length !== 32) continue;

    // Decompress the 32-byte packed BJJ point back to (x, y)
    const coords = babyJub.unpackPoint(spendKeyBytes);
    if (!coords) continue;
    const [noteKeyX, noteKeyY] = coords;

    latest = {
      note_key_x: noteKeyX.toString(),
      note_key_y: noteKeyY.toString(),
      enc_key: bytesToHex(viewKeyBytes),
    };
  }

  return latest;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
