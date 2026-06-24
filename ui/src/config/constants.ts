import { poseidonHash } from "nexus-crypto";

export const POOL_CONTRACT_ID_LOCAL =
  "CBEWO555KW4WTISV5ME4POO7PN63JEM4TEUCO7UYI4IHJN4RKYITK2XT";

export const POOL_CONTRACT_ID_TESTNET = "";

export const DUMMY_SOURCE_ACCOUNT =
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

export const BN254_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const circuitPath = {
  zkey: "/main.zkey",
  wasm: "/main.wasm",
};

export const TREE_DEPTH = 20;

// Canonical empty-leaf value for the commitment tree: Poseidon("XLM") =
// Poseidon(88, 76, 77). MUST match the pool contract's `get_zeroes()[0]`.
export const ZERO_LEAF = poseidonHash([88n, 76n, 77n]);
