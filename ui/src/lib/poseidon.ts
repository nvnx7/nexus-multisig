import { poseidon } from "@iden3/js-crypto";

export function poseidonHash(inputs: bigint[]): bigint {
  return BigInt(poseidon.hash(inputs).toString());
}
