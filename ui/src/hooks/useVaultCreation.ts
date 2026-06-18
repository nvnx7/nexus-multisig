"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSession } from "@/api/dkg/createSession";
import { getSession, type DkgSessionDetail } from "@/api/dkg/getSession";
import { submitRound1 } from "@/api/dkg/submitRound1";
import { getRound1Data } from "@/api/dkg/getRound1Data";
import { submitRound2 } from "@/api/dkg/submitRound2";
import { getRound2Data } from "@/api/dkg/getRound2Data";
import { getUser } from "@/api/users/getUser";
import { createGroup } from "@/api/groups/createGroup";
import {
  dkgRound1,
  dkgRound2,
  dkgRound3,
  encryptShare,
  decryptShare,
  generateEncryptionKey,
  encPkFromSk,
  type DkgRound1Secret,
  type DkgRound1Public,
} from "@/lib/dkg";
import type { ShieldedWallet } from "@/context/wallet-context";

// ── Types ──────────────────────────────────────────────────────────────────

export type VaultStep =
  | "configure"
  | "submitting_r1"
  | "waiting_r1"
  | "submitting_r2"
  | "waiting_r2"
  | "finalizing"
  | "complete"
  | "error";

export interface VaultCreationState {
  step: VaultStep;
  sessionId: string | null;
  sessionData: DkgSessionDetail | null;
  groupId: string | null;
  groupAddress: string | null;
  error: string | null;
}

const INITIAL: VaultCreationState = {
  step: "configure",
  sessionId: null,
  sessionData: null,
  groupId: null,
  groupAddress: null,
  error: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollSession(
  id: string,
  until: (s: DkgSessionDetail) => boolean,
  onUpdate: (s: DkgSessionDetail) => void,
  signal: { cancelled: boolean },
  intervalMs = 2_000,
  timeoutMs = 300_000,
): Promise<DkgSessionDetail> {
  const deadline = Date.now() + timeoutMs;
  while (!signal.cancelled && Date.now() < deadline) {
    const session = await getSession(id);
    onUpdate(session);
    if (until(session)) return session;
    await sleep(intervalMs);
  }
  if (signal.cancelled) throw new Error("Cancelled");
  throw new Error("Timed out waiting for other participants (5 min)");
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useVaultCreation() {
  const [state, setState] = useState<VaultCreationState>(INITIAL);
  const cancelRef = useRef({ cancelled: false });

  useEffect(() => {
    return () => {
      cancelRef.current.cancelled = true;
    };
  }, []);

  const start = useCallback(
    async (
      stellarAddress: string,
      shielded: ShieldedWallet,
      memberStellarAddresses: string[],
      threshold: number,
    ) => {
      cancelRef.current = { cancelled: false };
      const signal = cancelRef.current;

      const set = (patch: Partial<VaultCreationState>) =>
        setState((s) => ({ ...s, ...patch }));

      try {
        // ── 1. Create DKG session with Stellar addresses as participant IDs ──
        set({ step: "submitting_r1", error: null });
        const { id: sessionId, participants } = await createSession(
          threshold,
          memberStellarAddresses,
        );

        const myParticipant = participants.find(
          (p) => p.address === stellarAddress,
        );
        if (!myParticipant)
          throw new Error("Own address not found in session participants");
        const myIndex = myParticipant.participant_index;

        // ── 2. Round 1: generate polynomial + submit commitments ────────────
        const { secret: r1Secret, public: r1Public } = dkgRound1(
          myIndex,
          threshold,
        );
        await submitRound1(
          sessionId,
          stellarAddress,
          r1Public.commitments.map(
            (c) => [c.x.toString(), c.y.toString()] as [string, string],
          ),
        );

        // ── 3. Wait for everyone's round 1 ─────────────────────────────────
        set({ step: "waiting_r1", sessionId });
        const r1Done = await pollSession(
          sessionId,
          (s) => s.status === "round2" || s.status === "complete",
          (s) => set({ sessionData: s }),
          signal,
        );
        if (signal.cancelled) return;

        // ── 4. Round 2: fetch all commitments, encrypt + submit shares ──────
        set({ step: "submitting_r2", sessionData: r1Done });

        const r1DataResult = await getRound1Data(sessionId);
        if (!r1DataResult.ready) throw new Error("Round 1 data not ready");

        const allRound1Public: DkgRound1Public[] = r1DataResult.round1.map(
          (r) => ({
            index: r.participant_index,
            commitments: r.commitments.map(([x, y]) => ({
              x: BigInt(x),
              y: BigInt(y),
            })),
          }),
        );

        const rawShares = dkgRound2(
          r1Secret,
          participants.map((p) => p.participant_index),
        );

        // Fetch shielded pubkeys for ECDH encryption from the local DB.
        // Participants are keyed by Stellar address (registered during onboarding).
        const pubkeyMap = new Map<
          string,
          { pubkey_x: string; pubkey_y: string }
        >();
        await Promise.all(
          participants.map(async (p) => {
            const user = await getUser(p.address); // p.address = Stellar address
            if (!user) throw new Error(`Pubkey not found for ${p.address}`);
            pubkeyMap.set(p.address, user);
          }),
        );

        // Build API share objects with ECDH-encrypted share values
        const apiShares = rawShares.map((share) => {
          if (share.recipientIndex === myIndex) {
            return {
              recipient_index: share.recipientIndex,
              R: null,
              ciphertext: share.value.toString(16).padStart(64, "0"),
            };
          }
          const recipientAddr = participants.find(
            (p) => p.participant_index === share.recipientIndex,
          )!.address;
          const pk = pubkeyMap.get(recipientAddr)!;
          const recipientPubKey = {
            x: BigInt(pk.pubkey_x),
            y: BigInt(pk.pubkey_y),
          };
          const { R, ciphertext } = encryptShare(share.value, recipientPubKey);
          return {
            recipient_index: share.recipientIndex,
            R: [R.x.toString(), R.y.toString()] as [string, string],
            ciphertext,
          };
        });

        // Participant 1 generates the group encryption key
        let enc_sk: bigint | null = null;
        let apiEncKeyShares: typeof apiShares | undefined;

        if (myIndex === 1) {
          const encKey = generateEncryptionKey();
          enc_sk = encKey.enc_sk;

          apiEncKeyShares = participants.map((p) => {
            if (p.participant_index === 1) {
              return {
                recipient_index: 1,
                R: null,
                ciphertext: enc_sk!.toString(16).padStart(64, "0"),
              };
            }
            const pk = pubkeyMap.get(p.address)!;
            const recipientPubKey = {
              x: BigInt(pk.pubkey_x),
              y: BigInt(pk.pubkey_y),
            };
            const { R, ciphertext } = encryptShare(enc_sk!, recipientPubKey);
            return {
              recipient_index: p.participant_index,
              R: [R.x.toString(), R.y.toString()] as [string, string],
              ciphertext,
            };
          });
        }

        await submitRound2(sessionId, stellarAddress, apiShares, apiEncKeyShares);

        // ── 5. Wait for everyone's round 2 ─────────────────────────────────
        set({ step: "waiting_r2" });
        const r2Done = await pollSession(
          sessionId,
          (s) => s.status === "complete",
          (s) => set({ sessionData: s }),
          signal,
        );
        if (signal.cancelled) return;

        // ── 6. Round 3: decrypt shares + derive final key ───────────────────
        set({ step: "finalizing", sessionData: r2Done });

        const r2DataResult = await getRound2Data(sessionId, stellarAddress);
        if (!r2DataResult.ready) throw new Error("Round 2 data not ready");

        const myPrivKey = BigInt(shielded.privateKey);
        const receivedShares = r2DataResult.shares.map((s) => ({
          senderIndex: s.sender_index,
          value:
            s.R === null
              ? BigInt("0x" + s.ciphertext)
              : decryptShare(
                  s.ciphertext,
                  { x: BigInt(s.R[0]), y: BigInt(s.R[1]) },
                  myPrivKey,
                ),
        }));

        const { groupPublicKey } = dkgRound3(myIndex, allRound1Public, receivedShares);

        if (myIndex !== 1) {
          const eks = r2DataResult.enc_key_share;
          if (!eks) throw new Error("Encryption key share missing from round 2 data");
          enc_sk =
            eks.R === null
              ? BigInt("0x" + eks.ciphertext)
              : decryptShare(
                  eks.ciphertext,
                  { x: BigInt(eks.R[0]), y: BigInt(eks.R[1]) },
                  myPrivKey,
                );
        }

        const enc_pk = encPkFromSk(enc_sk!);

        // ── 7. Create group record ──────────────────────────────────────────
        const members = participants.map((p) => {
          const pk = pubkeyMap.get(p.address)!;
          return {
            address: p.address, // Stellar address
            pubkey: [pk.pubkey_x, pk.pubkey_y] as [string, string],
          };
        });

        const { id: groupId, agg_address } = await createGroup({
          threshold,
          members,
          agg_pubkey: [
            groupPublicKey.x.toString(),
            groupPublicKey.y.toString(),
          ],
          enc_pubkey: [enc_pk.x.toString(), enc_pk.y.toString()],
          dkg_session_id: sessionId,
        });

        set({ step: "complete", groupId, groupAddress: agg_address });
      } catch (err: unknown) {
        if ((err as Error).message === "Cancelled") return;
        set({
          step: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    },
    [],
  );

  const reset = useCallback(() => {
    cancelRef.current.cancelled = true;
    setState(INITIAL);
  }, []);

  return { state, start, reset };
}
