import {
  type Point,
  type SerializedNonces,
  eciesDecrypt,
  eciesEncrypt,
} from "nexus-crypto";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

/**
 * ECIES-encrypt the committer's secret nonces to their OWN view pubkey, so they
 * can recover them at sign time from the coordinator (no fragile local storage).
 */
export function encryptNonces(viewPubKey: Point, nonces: SerializedNonces): string {
  return bytesToHex(eciesEncrypt(viewPubKey, enc.encode(JSON.stringify(nonces))));
}

export function decryptNonces(viewKey: bigint, blob: string): SerializedNonces {
  return JSON.parse(dec.decode(eciesDecrypt(viewKey, hexToBytes(blob)))) as SerializedNonces;
}
