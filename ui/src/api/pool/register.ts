"use client";

import { useMutation } from "@tanstack/react-query";
import type { Account } from "bindings";
import { getPoolClient } from "@/api/contract";
import { getShieldedAddress } from "./getShieldedAddress";
import type { ShieldedAddress } from "@/lib/shielded";
import { EdwardsPoint } from "@noble/curves/abstract/edwards.js";
import { numberToBytesBE } from "@noble/curves/utils.js";

// noble-curves v1.9.7 BabyJubJub: Point.toBytes() uses big-endian but places
// the sign bit in the last byte (y's LSB), which collides with y's own bits.
// Use BE with sign in bytes[0] (y's MSB) — safe because y < 2^254 guarantees
// bits 6-7 of the MSB byte are always 0 and thus free.
export function packPoint(pt: EdwardsPoint): Uint8Array {
  const { x, y } = pt.toAffine();
  const bytes = numberToBytesBE(y, 32);
  if (x & 1n) bytes[0] |= 0x80; // sign of x in bit 7 of MSB byte (always free)
  return bytes;
}

export async function isRegistered(stellarAddress: string): Promise<boolean> {
  return (await getShieldedAddress(stellarAddress)) !== null;
}

export async function registerShieldedAddress(params: {
  owner: string;
  shieldedAddress: ShieldedAddress;
}): Promise<void> {
  const { owner, shieldedAddress } = params;
  const account: Account = {
    owner,
    spend_public_key: Buffer.from(packPoint(shieldedAddress.spendPubKey)),
    view_public_key: Buffer.from(packPoint(shieldedAddress.viewPubKey)),
  };

  const client = getPoolClient(owner, true);
  console.log("Tx sending");
  const tx = await client.register({ account });
  console.log("Tx", tx);
  const res = await tx.signAndSend();
  console.log("Res", res);
}

export function useRegisterShieldedAddress() {
  return useMutation({
    // mutationKey: ["registerShieldedAddress"],
    mutationFn: registerShieldedAddress,
  });
}
