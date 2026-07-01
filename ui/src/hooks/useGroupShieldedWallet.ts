"use client";

import { useMemo } from "react";
import { type Point, deserializeDkgRound3 } from "nexus-crypto";
import { useWallet } from "@/context/wallet-context";
import { useGetGroup } from "@/api/groups/getGroup";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { useGetSignSessions } from "@/api/sign-sessions/getSignSessions";
import { useGetGroupNotes } from "@/api/pool/getGroupNotes";
import {
  useProposeTx,
  type ProposeParams,
} from "@/api/sign-sessions/proposeTx";
import { decryptGvk } from "nexus-crypto";
import { computeMyFrostKey } from "@/lib/dkg";
import { loadFrostKey, saveFrostKey } from "@/lib/frostKeyStore";
import {
  composeVaultAddress,
  deriveGroupViewPublicKey,
} from "@/lib/vaultAddress";

export type { ProposeParams };

export function useGroupShieldedWallet(vaultAddress: string | undefined) {
  const { stellarAddress, shielded } = useWallet();

  const { data: group, isLoading, error } = useGetGroup(vaultAddress);

  const gvk = useMemo(() => {
    if (!group || !shielded || !stellarAddress) return null;
    const blob = group.group_view_key[stellarAddress];
    if (!blob) return null;
    try {
      return decryptGvk(shielded.viewKey, blob);
    } catch {
      return null;
    }
  }, [group, shielded, stellarAddress]);

  const cached = useMemo(
    () =>
      group && stellarAddress
        ? loadFrostKey(group.group_address, stellarAddress)
        : null,
    [group, stellarAddress],
  );

  const recoverSessionId =
    !cached && stellarAddress
      ? (group?.dkg_session_id ?? undefined)
      : undefined;
  const { data: dkgSession } = useGetDkgSession({
    sessionId: recoverSessionId,
  });

  const frostKey = useMemo(() => {
    if (cached) return deserializeDkgRound3(cached);
    if (!dkgSession || !stellarAddress || dkgSession.status !== "complete")
      return null;
    if (!dkgSession.round1_data[stellarAddress]) return null;
    try {
      const { key, groupAddress } = computeMyFrostKey(
        dkgSession.round1_data,
        dkgSession.round2_data,
        stellarAddress,
      );
      saveFrostKey(groupAddress, stellarAddress, key);
      return deserializeDkgRound3(key);
    } catch {
      return null;
    }
  }, [cached, dkgSession, stellarAddress]);

  const groupSpendPublicKey = useMemo<Point | null>(
    () =>
      group
        ? { x: BigInt(group.group_pubkey[0]), y: BigInt(group.group_pubkey[1]) }
        : null,
    [group],
  );
  const groupViewPublicKey = useMemo<Point | null>(
    () => (gvk != null ? deriveGroupViewPublicKey(gvk) : null),
    [gvk],
  );
  const shareableAddress = useMemo(
    () =>
      groupSpendPublicKey && groupViewPublicKey
        ? composeVaultAddress(groupSpendPublicKey, groupViewPublicKey)
        : null,
    [groupSpendPublicKey, groupViewPublicKey],
  );

  const { data: signSessions } = useGetSignSessions(group?.group_address);

  const { data: ownedNotes, isLoading: balanceLoading } = useGetGroupNotes({
    group,
    gvk,
  });
  const balance = useMemo<bigint | null>(() => {
    if (!ownedNotes) return null;
    return ownedNotes.reduce((acc, note) => acc + note.amount, 0n);
  }, [ownedNotes]);

  const proposeMutation = useProposeTx({
    group,
    gvk,
    frostKey,
    shielded,
    stellarAddress,
    groupSpendPublicKey,
    groupViewPublicKey,
  });

  return {
    group,
    isLoading,
    error,
    threshold: group?.threshold,
    members: group?.members,
    groupSpendPublicKey,
    groupViewPublicKey,
    shareableAddress,
    gvk,
    frostKey,
    frostSecret: frostKey?.secret ?? null,
    frostPublic: frostKey?.public ?? null,
    signSessions: signSessions ?? [],
    balance,
    balanceLoading,
    proposeTx: (params: ProposeParams) => proposeMutation.mutateAsync(params),
  };
}
