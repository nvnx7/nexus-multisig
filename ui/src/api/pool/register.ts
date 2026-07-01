"use client";

import { useMutation } from "@tanstack/react-query";
import type { Account } from "bindings";
import { getPoolClient } from "@/api/contract";
import { getShieldedAddress } from "./getShieldedAddress";
import type { ShieldedAddress } from "nexus-crypto";

export async function isRegistered(stellarAddress: string): Promise<boolean> {
  return (await getShieldedAddress(stellarAddress)) !== null;
}

export async function registerShieldedAddress(params: {
  owner: string;
  shieldedAddress: ShieldedAddress;
}) {
  const { owner, shieldedAddress } = params;
  const account: Account = {
    owner,
    spend_public_key: Buffer.from(shieldedAddress.spendPubKey.toBytes()),
    view_public_key: Buffer.from(shieldedAddress.viewPubKey.toBytes()),
  };

  const client = getPoolClient(owner, true);
  const tx = await client.register({ account });
  const sendTxRes = await tx.signAndSend();
  return sendTxRes;
}

export function useRegisterShieldedAddress() {
  return useMutation({
    // mutationKey: ["registerShieldedAddress"],
    mutationFn: registerShieldedAddress,
  });
}
