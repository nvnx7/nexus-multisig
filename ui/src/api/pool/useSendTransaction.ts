"use client";

import { useCallback } from "react";
import type { FrostSignature } from "nexus-crypto";
import { useWallet } from "@/context/wallet-context";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import { ZERO_LEAF } from "@/config/constants";
import { buildTransactContext, type TxType } from "@/lib/tx/proof";
import { getCommitments } from "./getCommitments";
import { getGroupNotes } from "./getGroupNotes";
import { useTransact } from "./useTransact";

export type SendParams = {
  type: TxType;
  amount: bigint;
  /** Stellar destination for a withdraw. */
  withdrawRecipient?: string;
  /** 64-byte vault address for a transfer. */
  recipientAddress?: string;
  /**
   * Produces the aggregate signature over the tx message. The message is only
   * known after the witness is built, so signing happens via this callback
   * (the sign phase runs the ceremony; a single-key sign works for testing).
   */
  sign: (msg: bigint) => FrostSignature | Promise<FrostSignature>;
};

/**
 * Ties the data layer to the witness builder and `useTransact`: fetches the tree
 * + the group's notes, builds the `TransactInput`/`ExtData`, then proves + submits.
 * The aggregate signature is supplied by the caller (sign phase).
 */
export function useSendTransaction(vaultAddress: string | undefined) {
  const { stellarAddress } = useWallet();
  const { group, gvk, groupSpendPublicKey, groupViewPublicKey } =
    useGroupShieldedWallet(vaultAddress);
  const { transact, reset, status, error, txHash, isPending } = useTransact();

  const send = useCallback(
    async (params: SendParams): Promise<string> => {
      if (
        !group ||
        gvk == null ||
        !groupSpendPublicKey ||
        !groupViewPublicKey ||
        !stellarAddress
      )
        throw new Error("vault not ready");

      const [commitments, notes] = await Promise.all([
        getCommitments(),
        getGroupNotes({ group, gvk }),
      ]);

      // Dense leaf array by tree index (gaps = ZERO_LEAF).
      const maxIdx = commitments.reduce((m, c) => Math.max(m, c.index), -1);
      const leaves: bigint[] = Array(maxIdx + 1).fill(ZERO_LEAF);
      for (const c of commitments) leaves[c.index] = BigInt(c.commitment);

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

      // Sign the message (only known now), then fill the signature into the witness.
      const sig = await params.sign(msg);
      input.sig_s = sig.s;
      input.sig_e = sig.e;

      return transact(stellarAddress, input, extData);
    },
    [group, gvk, groupSpendPublicKey, groupViewPublicKey, stellarAddress, transact],
  );

  return { send, reset, status, error, txHash, isPending };
}
