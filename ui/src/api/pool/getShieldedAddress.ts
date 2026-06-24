import { scValToNative } from "@stellar/stellar-sdk";
import { getRpcServer } from "@/api/rpc";
import { POOL_CONTRACT_ID_LOCAL } from "@/config/constants";
import { ShieldedAddress } from "@/lib/shielded";
import { babyjubjub as bbj } from "@noble/curves/misc.js";
import { useQuery } from "@tanstack/react-query";
import { EdwardsPoint } from "@noble/curves/abstract/edwards.js";

// Inverse of serializeBjjPoint in register.ts: reads BE-encoded y with the
// sign of x in bit 7 of bytes[0] (the MSB byte), then feeds LE bytes into
// noble-curves' fromBytes() which expects that format.
function deserializeBjjPoint(beBytes: Uint8Array): EdwardsPoint {
  const buf = new Uint8Array(beBytes);
  const sign = (buf[0] >> 7) & 1;
  buf[0] &= 0x7f;
  buf.reverse();
  if (sign) buf[31] |= 0x80;
  return bbj.Point.fromBytes(buf);
}

export async function getShieldedAddress(
  owner: string,
): Promise<ShieldedAddress | null> {
  if (!POOL_CONTRACT_ID_LOCAL)
    throw new Error("POOL_CONTRACT_ID not configured");

  const server = getRpcServer();
  const { sequence: latestLedger } = await server.getLatestLedger();
  const estimatedStart = latestLedger - 17_000;

  let startLedger: number;
  if (estimatedStart < 1) {
    // Short-lived chain (local dev) — probe to discover the actual oldest ledger
    const probe = await server.getEvents({
      startLedger: latestLedger,
      filters: [],
      limit: 1,
    });
    startLedger = probe.oldestLedger;
  } else {
    startLedger = estimatedStart;
  }

  const response = await server.getEvents({
    startLedger,
    filters: [{ type: "contract", contractIds: [POOL_CONTRACT_ID_LOCAL] }],
    limit: 10_000,
  });
  console.log("response", response);

  let latest: ShieldedAddress | null = null;

  for (const ev of response.events) {
    if (ev.topic.length < 2) continue;

    let eventName: string;
    let eventOwner: string;
    try {
      eventName = String(scValToNative(ev.topic[0]!));
      eventOwner = String(scValToNative(ev.topic[1]!));
    } catch {
      continue;
    }
    if (eventName !== "public_key_event") continue;
    if (eventOwner !== owner) continue;

    const data = scValToNative(ev.value) as Record<string, unknown> | null;
    console.log("Event data", data);
    if (!data) continue;

    const spendKeyBytes = data.spend_public_key;
    const viewKeyBytes = data.view_public_key;

    if (
      !(spendKeyBytes instanceof Uint8Array) ||
      !(viewKeyBytes instanceof Uint8Array)
    ) {
      continue;
    }

    if (spendKeyBytes.length !== 32 || viewKeyBytes.length !== 32) {
      continue;
    }

    console.log("Found matching event with valid key lengths");
    const spendPublicKey = deserializeBjjPoint(spendKeyBytes);
    const viewPublicKey = deserializeBjjPoint(viewKeyBytes);

    const shieldedAddress = new ShieldedAddress({
      spendPubKey: spendPublicKey,
      viewPubKey: viewPublicKey,
    });

    latest = shieldedAddress;
  }

  return latest;
}

export const useGetShieldedAddress = (stellarAddress: string) => {
  return useQuery({
    queryKey: ["getShieldedAddress", stellarAddress],
    queryFn: () => getShieldedAddress(stellarAddress),
    enabled: !!stellarAddress,
  });
};
