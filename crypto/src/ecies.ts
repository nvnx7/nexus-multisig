import { babyjubjub } from "@noble/curves/misc.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { managedNonce } from "@noble/ciphers/utils.js";
import { concatBytes, numberToBytesBE } from "@noble/curves/utils.js";
import { poseidonHash } from "./poseidon";
import { mod, randomScalar } from "./utils";
import { BASE8, ORDER } from "./constants";
import type { Point } from "./frost/signature";

// A ciphertext is the ephemeral public key R (compressed babyjubjub, 32 bytes)
// followed by the xchacha20poly1305 ciphertext.
const R_BYTES = 32;

/** Symmetric key from the ECDH shared point: 32-byte BE of Poseidon(S.x, S.y). */
function sharedKey(S: { x: bigint; y: bigint }): Uint8Array {
  return numberToBytesBE(poseidonHash([S.x, S.y]), 32);
}

/** ECIES over babyjubjub (ephemeral ECDH + xchacha20poly1305). Returns `R || ct`. */
export function eciesEncrypt(recipientPub: Point, msg: Uint8Array): Uint8Array {
  const eph = randomScalar();
  const R = BASE8.multiply(eph);
  const S = babyjubjub.Point.fromAffine(recipientPub).multiply(eph);
  const ct = managedNonce(xchacha20poly1305)(sharedKey(S)).encrypt(msg) as Uint8Array;
  return concatBytes(R.toBytes(), ct);
}

export function eciesDecrypt(priv: bigint, ciphertext: Uint8Array): Uint8Array {
  const R = babyjubjub.Point.fromBytes(ciphertext.slice(0, R_BYTES));
  const ct = ciphertext.slice(R_BYTES);
  const S = R.multiply(mod(priv, ORDER));
  return managedNonce(xchacha20poly1305)(sharedKey(S)).decrypt(ct) as Uint8Array;
}
