import { poseidon } from "@iden3/js-crypto";

export const poseidonHash = (inputs: bigint[]): bigint => {
  return poseidon.hash(inputs);
};

// XLM in ASCII: 88=X, 76=L, 77=M — on-chain pool uses this as zeroes[0]
export const MERKLE_ZERO_LEAF: bigint = poseidonHash([88n, 76n, 77n]);
