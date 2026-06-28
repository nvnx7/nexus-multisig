import { babyjubjub } from "@noble/curves/misc.js";

export const BASE8 = babyjubjub.Point.BASE;
export const ORDER = babyjubjub.Point.CURVE().n;
export const BN254_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;