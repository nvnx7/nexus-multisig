import type { SerializedDKGRound3 } from "nexus-crypto";

// MVP: the member's DKG key (incl. the secret signing share) is cached locally,
// keyed by vault group_address + the member's stellar address — same trust model
// as the shielded master-secret cache in wallet-context.
const PREFIX = "nexus:frost-key:";

function storageKey(groupAddress: string, stellarAddress: string): string {
  return `${PREFIX}${groupAddress}:${stellarAddress}`;
}

export function saveFrostKey(
  groupAddress: string,
  stellarAddress: string,
  key: SerializedDKGRound3,
): void {
  try {
    localStorage.setItem(storageKey(groupAddress, stellarAddress), JSON.stringify(key));
  } catch {}
}

export function loadFrostKey(
  groupAddress: string,
  stellarAddress: string,
): SerializedDKGRound3 | null {
  try {
    const raw = localStorage.getItem(storageKey(groupAddress, stellarAddress));
    return raw ? (JSON.parse(raw) as SerializedDKGRound3) : null;
  } catch {
    return null;
  }
}
