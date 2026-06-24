import { babyjubjub } from "@noble/curves/misc.js";

export const BASE8 = babyjubjub.Point.BASE;
export const ORDER = babyjubjub.Point.CURVE().n;