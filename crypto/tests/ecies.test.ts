import { describe, expect, test } from "bun:test";
import { bytesToNumberBE, numberToBytesBE, randomBytes } from "@noble/curves/utils.js";
import { BASE8, ORDER, eciesDecrypt, eciesEncrypt, mod } from "../src/index";

function keypair() {
  const priv = mod(bytesToNumberBE(randomBytes(48)), ORDER);
  const pub = BASE8.multiply(priv);
  return { priv, pub: { x: pub.x, y: pub.y } };
}

describe("ecies", () => {
  test("round-trips a message under the recipient keypair", () => {
    const { priv, pub } = keypair();
    const msg = numberToBytesBE(123456789n, 32);
    const decrypted = eciesDecrypt(priv, eciesEncrypt(pub, msg));
    expect(bytesToNumberBE(decrypted)).toBe(123456789n);
  });

  test("ciphertext is R || ct bytes (no separators)", () => {
    const { priv, pub } = keypair();
    const msg = randomBytes(32);
    const ct = eciesEncrypt(pub, msg);
    expect(ct).toBeInstanceOf(Uint8Array);
    expect(ct.length).toBeGreaterThan(32); // 32-byte R prefix + sealed message
    expect(eciesDecrypt(priv, ct)).toEqual(msg);
  });

  test("a different key cannot decrypt", () => {
    const { pub } = keypair();
    const other = keypair();
    const ct = eciesEncrypt(pub, randomBytes(32));
    expect(() => eciesDecrypt(other.priv, ct)).toThrow();
  });
});
