import { babyjubjub as bjj } from "@noble/curves/misc.js";
import { mapHashToField } from "@noble/curves/abstract/modular.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToNumberBE } from "@noble/curves/utils.js";
import type { EdwardsPoint } from "@noble/curves/abstract/edwards.js";
import { poseidonHash } from "./poseidon";

const DOMAIN = "v1-nexus-shielded-wallet";
const ORDER = bjj.Point.CURVE().n;

export class ShieldedWallet {
  readonly masterSecret: Uint8Array;
  readonly spendKey: bigint;
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

  static fromMasterKey(masterSecret: Uint8Array): ShieldedWallet {
    const salt = new TextEncoder().encode(DOMAIN);
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
    return new ShieldedWallet({ masterSecret, spendKey, viewKey });
  }

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
