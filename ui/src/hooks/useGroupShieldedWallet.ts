"use client";

import { useCallback, useMemo } from "react";
import {
  type Point,
  deserializeDkgRound3,
  frostCommit,
  serializeNonceCommitments,
  serializeNonces,
} from "nexus-crypto";
import { useWallet } from "@/context/wallet-context";
import { useGetGroup } from "@/api/groups/getGroup";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import {
  useCreateSignSession,
  type TxProposal,
} from "@/api/sign-sessions/createSignSession";
import { useGetSignSessions } from "@/api/sign-sessions/getSignSessions";
import { decryptGvk } from "@/lib/groupViewKey";
import { encryptNonces } from "@/lib/nonceBackup";
import { computeMyFrostKey } from "@/lib/dkg";
import { loadFrostKey, saveFrostKey } from "@/lib/frostKeyStore";
import {
  composeVaultAddress,
  deriveGroupViewPublicKey,
} from "@/lib/vaultAddress";

/**
 * Per-vault group state for whatever vault page is in view: loads the group by
 * its aggregate address, decrypts the common view key (gvk) for the current
 * member, and exposes the signing-ceremony methods (scaffolded for now).
 */
export function useGroupShieldedWallet(vaultAddress: string | undefined) {
  const { stellarAddress, shielded } = useWallet();

  // getGroup resolves by id or group_address; the vault route param is the group_address.
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

  // The current member's DKG key — secret signing share + group public data,
  // required to commit and sign. Cached locally per group address; if absent it
  // is recomputed deterministically from the coordinator's stored DKG data.
  const cached = useMemo(
    () => (group && stellarAddress ? loadFrostKey(group.group_address, stellarAddress) : null),
    [group, stellarAddress],
  );

  const recoverSessionId =
    !cached && stellarAddress ? group?.dkg_session_id ?? undefined : undefined;
  const { data: dkgSession } = useGetDkgSession({ sessionId: recoverSessionId });

  const frostKey = useMemo(() => {
    if (cached) return deserializeDkgRound3(cached);
    if (!dkgSession || !stellarAddress || dkgSession.status !== "complete") return null;
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

  // The two group keys + the shareable 64-byte payment address.
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

  // Proposed transactions for this vault (visible to every member).
  const { data: signSessions } = useGetSignSessions(group?.group_address);
  const createSignSession = useCreateSignSession();

  // Propose a transaction + send our commitment. Our secret nonces are
  // ECIES-encrypted to our own view key and stored with the session, so they can
  // be recovered at sign time without keeping them on this device.
  const commit = useCallback(
    async (tx: TxProposal): Promise<string> => {
      if (!group || !stellarAddress || !frostKey || !shielded)
        throw new Error("group key not ready");
      const { nonces, commitments } = frostCommit(frostKey.secret);
      const viewPubKey = shielded.shieldedAddress().viewPubKey;
      const { id } = await createSignSession.mutateAsync({
        group_address: group.group_address,
        proposer: stellarAddress,
        tx,
        nonce_commitment: serializeNonceCommitments(commitments),
        enc_nonces: encryptNonces(
          { x: viewPubKey.x, y: viewPubKey.y },
          serializeNonces(nonces),
        ),
      });
      return id;
    },
    [group, stellarAddress, frostKey, shielded, createSignSession],
  );

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
    frostSecret: frostKey?.secret ?? null,
    frostPublic: frostKey?.public ?? null,
    signSessions: signSessions ?? [],
    commit,
    // Sign phase — wired in the next task.
    signShare: () => {
      throw new Error("not implemented: sign phase pending");
    },
  };
}
