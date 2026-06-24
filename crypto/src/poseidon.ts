import { poseidon } from "@iden3/js-crypto";

export const poseidonHash = (inputs: bigint[]): bigint => {
  return poseidon.hash(inputs);
};
