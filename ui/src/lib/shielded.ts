import { babyjubjub as bjj } from "@noble/curves/misc.js";
import { mapHashToField } from "@noble/curves/abstract/modular.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { poseidonHash } from "nexus-crypto";
import { bytesToNumberBE } from "@noble/curves/utils.js";
import { EdwardsPoint } from "@noble/curves/abstract/edwards.js";

const DOMAIN = "v1-nexus-shielded-wallet";
const ORDER = bjj.Point.CURVE().n;

export class ShieldedWallet {
  /** 32-byte master secret — never expose this outside key-derivation code. */
  readonly masterSecret: Uint8Array;
  /** Spending scalar — authorises creating / nullifying notes. */
  readonly spendKey: bigint;
  /** Viewing scalar — allows reading note contents without spending. */
  readonly viewKey: bigint;

  constructor(params: {
    masterSecret: Uint8Array;
    spendKey: bigint;
    viewKey: bigint;
  }) {
    this.masterSecret = params.masterSecret;
    this.spendKey = params.spendKey;
    this.viewKey = params.viewKey;
  }

  shieldedAddress(): ShieldedAddress {
    return new ShieldedAddress({
      viewPubKey: bjj.Point.BASE.multiply(this.viewKey),
      spendPubKey: bjj.Point.BASE.multiply(this.spendKey),
    });
  }

  /**
   * Derivation tree (HKDF-SHA256):
   *
   *   masterSecret
   *     ├─ spendKey     (IKM = masterSecret, salt = DOMAIN, info = "spend")
   *     │    └─ stealthSecret (IKM = spendKey, salt = DOMAIN, info = "stealth")
   *     └─ viewKey      (IKM = masterSecret, salt = DOMAIN, info = "view")
   */
  static fromMasterKey(masterSecret: Uint8Array): ShieldedWallet {
    const salt = new TextEncoder().encode(DOMAIN);

    // 48 bytes of HKDF output reduced to a curve scalar with negligible modulo
    // bias (RFC 9380 §5 / FIPS 186-5 A.2), via noble's mapHashToField.
    const spendKey = bytesToNumberBE(
      mapHashToField(
        hkdf(sha256, masterSecret, salt, new TextEncoder().encode("spend"), 48),
        ORDER,
      ),
    );

    const viewKey = bytesToNumberBE(
      mapHashToField(
        hkdf(sha256, masterSecret, salt, new TextEncoder().encode("view"), 48),
        ORDER,
      ),
    );

    return new ShieldedWallet({
      masterSecret,
      spendKey,
      viewKey,
    });
  }

  /**
   * Derives a full ShieldedWallet from a raw signature.
   * Use this when creating the wallet for the first time.
   * Use `fromMasterKey` when recovering from a stored masterSecret.
   */
  static fromSignature(signature: Uint8Array): ShieldedWallet {
    const salt = new TextEncoder().encode(DOMAIN);
    const masterSecret = hkdf(
      sha256,
      signature,
      salt,
      new TextEncoder().encode("master"),
      32,
    );
    return ShieldedWallet.fromMasterKey(masterSecret);
  }
}

export class ShieldedAddress {
  readonly viewPubKey: EdwardsPoint;
  readonly spendPubKey: EdwardsPoint;
  readonly address: bigint;

  constructor(params: { viewPubKey: EdwardsPoint; spendPubKey: EdwardsPoint }) {
    this.viewPubKey = params.viewPubKey;
    this.spendPubKey = params.spendPubKey;
    this.address = poseidonHash([params.spendPubKey.x, params.spendPubKey.y]);
  }
}
