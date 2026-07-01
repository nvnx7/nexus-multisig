import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Key } from "@noble/curves/abstract/frost.js";
import {
  type Point,
  frostCommit,
  serializeNonceCommitments,
  serializeNonces,
} from "nexus-crypto";
import { getCommitments } from "@/api/pool/getCommitments";
import { getGroupNotes } from "@/api/pool/getGroupNotes";
import type { GroupDetail } from "@/api/groups/getGroup";
import { createSignSession } from "@/api/sign-sessions/createSignSession";
import { encryptNonces } from "@/lib/nonceBackup";
import type { ShieldedWallet } from "nexus-crypto";
import { buildTransactContext, type TxType } from "@/lib/tx/proof";
import { toTxDetails } from "@/lib/tx/txDetails";

export type ProposeParams = {
  type: TxType;
  amount: bigint;
  withdrawRecipient?: string;
  recipientAddress?: string;
};

type ProposeTxDeps = {
  group: GroupDetail;
  gvk: bigint;
  frostKey: Key;
  shielded: ShieldedWallet;
  stellarAddress: string;
  groupSpendPublicKey: Point;
  groupViewPublicKey: Point;
};

export async function proposeTx(
  params: ProposeParams,
  deps: ProposeTxDeps,
): Promise<string> {
  const {
    group,
    gvk,
    frostKey,
    shielded,
    stellarAddress,
    groupSpendPublicKey,
    groupViewPublicKey,
  } = deps;

  const [commitments, notes] = await Promise.all([
    getCommitments(),
    getGroupNotes({ group, gvk }),
  ]);

  const leaves = commitments.map((c) => BigInt(c.commitment));

  const { input, extData, msg } = buildTransactContext({
    type: params.type,
    amount: params.amount,
    sender: stellarAddress,
    groupSpendPublicKey,
    groupViewPublicKey,
    notes,
    leaves,
    withdrawRecipient: params.withdrawRecipient,
    recipientAddress: params.recipientAddress,
  });

  const { nonces, commitments: nonceCommitment } = frostCommit(frostKey.secret);
  const viewPubKey = shielded.shieldedAddress().viewPubKey;

  const { id } = await createSignSession({
    group_address: group.group_address,
    proposer: stellarAddress,
    tx_details: toTxDetails({ type: params.type, input, extData }),
    tx_hash: msg.toString(),
    nonce_commitment: serializeNonceCommitments(nonceCommitment),
    enc_nonces: encryptNonces(
      { x: viewPubKey.x, y: viewPubKey.y },
      serializeNonces(nonces),
    ),
  });

  return id;
}

export function useProposeTx(deps: {
  group: GroupDetail | undefined;
  gvk: bigint | null;
  frostKey: Key | null;
  shielded: ShieldedWallet | null;
  stellarAddress: string | null;
  groupSpendPublicKey: Point | null;
  groupViewPublicKey: Point | null;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ProposeParams) => {
      const {
        group,
        gvk,
        frostKey,
        shielded,
        stellarAddress,
        groupSpendPublicKey,
        groupViewPublicKey,
      } = deps;
      if (
        !group ||
        gvk == null ||
        !frostKey ||
        !shielded ||
        !stellarAddress ||
        !groupSpendPublicKey ||
        !groupViewPublicKey
      )
        throw new Error("vault not ready");
      return proposeTx(params, {
        group,
        gvk,
        frostKey,
        shielded,
        stellarAddress,
        groupSpendPublicKey,
        groupViewPublicKey,
      });
    },
    onSuccess: () => {
      if (deps.group) {
        queryClient.invalidateQueries({
          queryKey: ["sign-sessions", deps.group.group_address],
        });
      }
    },
  });
}
