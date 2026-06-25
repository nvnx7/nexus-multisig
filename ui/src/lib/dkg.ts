import {
  bjj_FROST,
  deserializeDkgRound1,
  deserializeDkgRound2,
  dkgRound3,
  serializeDkgRound3,
  type SerializedDKGRound3,
} from "nexus-crypto";

/**
 * Computes the current member's final DKG key (round 3) from a completed
 * session. `dkgRound3` is deterministic (it just sums shares), so the same
 * session data always yields the same key — recoverable any time from the
 * coordinator's stored round1/round2 data, not only from a local cache.
 *
 * `groupAddress` is the vault/group address: the compressed aggregate public key
 * in hex (`commitments[0]`), so a payer can recover the pubkey from the address
 * — a hash could not.
 */
export function computeMyFrostKey(
  round1_data: Record<string, any>,
  round2_data: Record<string, any>,
  myAddress: string,
): { key: SerializedDKGRound3; groupAddress: string } {
  const myRound1Secret = deserializeDkgRound1(round1_data[myAddress]).secret;

  const othersRound1Public = Object.entries(round1_data)
    .filter(([addr]) => addr !== myAddress)
    .map(([, r1]) => deserializeDkgRound1(r1).public);

  const myId = bjj_FROST.Identifier.derive(myAddress);
  const othersRound2Public = Object.entries(round2_data)
    .filter(([addr]) => addr !== myAddress)
    .map(([addr, r2]) => {
      const share = deserializeDkgRound2(r2)[myId];
      if (!share) throw new Error(`Missing DKG Round 2 share from ${addr}`);
      return share;
    });

  const key = serializeDkgRound3(
    dkgRound3({ myRound1Secret, othersRound1Public, othersRound2Public }),
  );

  return { key, groupAddress: key.public.commitments[0] };
}
