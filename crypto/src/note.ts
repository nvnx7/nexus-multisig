import {
  bytesToHex,
  bytesToNumberBE,
  concatBytes,
  hexToBytes,
  numberToBytesBE,
  randomBytes,
} from "@noble/curves/utils.js";
import { eciesDecrypt, eciesEncrypt } from "./ecies";
import { poseidonHash } from "./poseidon";
import type { Point } from "./frost/signature";

const AMOUNT_BYTES = 31;
const SALT_BYTES = 24;

export class Note {
  /** Position in the Merkle commitment tree. Set after the note is located on-chain. */
  index?: number;

  constructor(
    readonly pubkey: Point,
    readonly amount: bigint,
    readonly salt: bigint,
  ) {}

  static randomSalt(): bigint {
    return bytesToNumberBE(randomBytes(SALT_BYTES));
  }

  /** New note with a random salt. */
  static random(pubkey: Point, amount: bigint): Note {
    return new Note(pubkey, amount, Note.randomSalt());
  }

  /** Dummy note (amount = 0) with a random salt. Used to pad circuit inputs. */
  static dummy(pubkey: Point): Note {
    return new Note(pubkey, 0n, Note.randomSalt());
  }

  /** ECIES-decrypt an encrypted blob → Note, or null if it doesn't belong to this key. */
  static decrypt(blob: string, gvk: bigint, ownerPubkey: Point): Note | null {
    try {
      const pt = eciesDecrypt(gvk, hexToBytes(blob));
      if (pt.length !== AMOUNT_BYTES + SALT_BYTES) return null;
      return new Note(
        ownerPubkey,
        bytesToNumberBE(pt.slice(0, AMOUNT_BYTES)),
        bytesToNumberBE(pt.slice(AMOUNT_BYTES)),
      );
    } catch {
      return null;
    }
  }

  /** Poseidon(pubkey.x, pubkey.y, amount, salt) — mirrors the circuit's NoteCommitment. */
  commitment(): bigint {
    return poseidonHash([this.pubkey.x, this.pubkey.y, this.amount, this.salt]);
  }

  /** Poseidon(commitment, index) — mirrors the circuit's NoteNullifier. */
  nullifier(index: bigint): bigint {
    return poseidonHash([this.commitment(), index]);
  }

  /** ECIES-encrypt the note's secret fields (amount || salt) to a group view key. */
  encrypt(viewPublicKey: Point): string {
    const plaintext = concatBytes(
      numberToBytesBE(this.amount, AMOUNT_BYTES),
      numberToBytesBE(this.salt, SALT_BYTES),
    );
    return bytesToHex(eciesEncrypt(viewPublicKey, plaintext));
  }
}
