"use client";

import { useCallback, useMemo } from "react";
import {
  bjj_FROST,
  deserializeNonceCommitments,
  deserializeNonces,
  frostAggregate,
  frostCommit,
  frostSign,
  serializeNonceCommitments,
  serializeNonces,
} from "nexus-crypto";
import { useWallet } from "@/context/wallet-context";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import { useGetSignSession } from "@/api/sign-sessions/getSignSession";
import { useSubmitCommit } from "@/api/sign-sessions/submitCommit";
import { useSubmitSigShare } from "@/api/sign-sessions/submitSigShare";
import { useSubmitSignature } from "@/api/sign-sessions/submitSignature";
import { useTransact } from "@/api/pool/useTransact";
import { encryptNonces, decryptNonces } from "@/lib/nonceBackup";
import { buildWitnessFromTxDetails, verifyTxDetails } from "@/lib/tx/txDetails";

/**
 * Drives the FROST signing ceremony for one sign session: commit → sign-share →
 * aggregate → submit. Exposes the current member's role/state so the session
 * page can show a single, state-appropriate action.
 */
export function useSignSession(
  vaultAddress: string | undefined,
  sessionId: string | undefined,
) {
  const { stellarAddress, shielded } = useWallet();
  const { group, frostKey } = useGroupShieldedWallet(vaultAddress);
  const { data: session, isLoading } = useGetSignSession(sessionId, {
    poll: true,
  });

  const submitCommit = useSubmitCommit();
  const submitSigShare = useSubmitSigShare();
  const submitSignature = useSubmitSignature();
  const {
    transact,
    status: transactStatus,
    txHash,
    error: transactError,
  } = useTransact();

  const role = useMemo(() => {
    const isMember =
      !!group &&
      !!stellarAddress &&
      group.members.some((m) => m.address === stellarAddress);
    const isCommitter =
      !!session &&
      !!stellarAddress &&
      stellarAddress in session.nonce_commitments;
    const hasSigned =
      !!session && !!stellarAddress && stellarAddress in session.sig_shares;
    return {
      isMember,
      isCommitter,
      hasSigned,
      canCommit:
        !!session &&
        session.status === "collecting_commits" &&
        isMember &&
        !isCommitter,
      canSign:
        !!session &&
        session.status === "collecting_shares" &&
        isCommitter &&
        !hasSigned,
      canAggregate:
        !!session && session.status === "complete" && !session.sig_s,
    };
  }, [group, session, stellarAddress]);

  // Commit: verify the pinned tx, then publish our nonce commitment.
  const commit = useCallback(async () => {
    if (!session || !frostKey || !stellarAddress || !shielded || !sessionId)
      throw new Error("not ready to commit");
    if (verifyTxDetails(session.tx_details).toString() !== session.tx_hash)
      throw new Error("tx_hash mismatch — refusing to commit");

    const { nonces, commitments } = frostCommit(frostKey.secret);
    const viewPubKey = shielded.shieldedAddress().viewPubKey;
    await submitCommit.mutateAsync({
      sessionId,
      address: stellarAddress,
      nonce_commitment: serializeNonceCommitments(commitments),
      enc_nonces: encryptNonces(
        { x: viewPubKey.x, y: viewPubKey.y },
        serializeNonces(nonces),
      ),
    });
  }, [session, frostKey, stellarAddress, shielded, sessionId, submitCommit]);

  // Sign: recover our nonces, produce our signature share over tx_hash.
  const sign = useCallback(async () => {
    if (!session || !frostKey || !stellarAddress || !shielded || !sessionId)
      throw new Error("not ready to sign");
    const blob = session.enc_nonces[stellarAddress];
    if (!blob) throw new Error("no stored nonces for this signer");

    const nonces = deserializeNonces(decryptNonces(shielded.viewKey, blob));
    const commitmentList = Object.values(session.nonce_commitments).map(
      deserializeNonceCommitments,
    );
    const { z } = frostSign(
      frostKey.secret,
      frostKey.public,
      nonces,
      commitmentList,
      BigInt(session.tx_hash),
    );
    await submitSigShare.mutateAsync({
      sessionId,
      address: stellarAddress,
      sig_share: z.toString(),
    });
  }, [session, frostKey, stellarAddress, shielded, sessionId, submitSigShare]);

  // Aggregate the shares, store the signature, rebuild the exact witness, submit.
  const aggregateAndSend = useCallback(async (): Promise<string> => {
    if (!session || !frostKey || !stellarAddress || !sessionId)
      throw new Error("not ready to send");

    const commitmentList = Object.values(session.nonce_commitments).map(
      deserializeNonceCommitments,
    );
    const shares = Object.entries(session.sig_shares).map(([addr, z]) => ({
      identifier:
        session.nonce_commitments[addr]?.identifier ??
        bjj_FROST.Identifier.derive(addr),
      z: BigInt(z),
    }));
    const sig = frostAggregate(
      frostKey.public,
      commitmentList,
      BigInt(session.tx_hash),
      shares,
    );

    const { input, extData } = buildWitnessFromTxDetails(
      session.tx_details,
      sig,
    );
    const hash = await transact(stellarAddress, input, extData);

    // Persist sig only after on-chain success — keeps canAggregate true on failure so the user can retry.
    await submitSignature.mutateAsync({
      sessionId,
      s: sig.s.toString(),
      e: sig.e.toString(),
    });

    return hash;
  }, [session, frostKey, stellarAddress, sessionId, submitSignature, transact]);

  return {
    session,
    isLoading,
    members: group?.members ?? [],
    ...role,
    commit,
    sign,
    aggregateAndSend,
    transactStatus,
    txHash,
    error:
      transactError ||
      submitCommit.error?.message ||
      submitSigShare.error?.message ||
      submitSignature.error?.message ||
      null,
  };
}
