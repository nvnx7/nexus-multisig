import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import {
    bytesToNumberBE,
    concatBytes,
    managedNonce,
    numberToBytesBE,
    randomBytes,
} from "@noble/ciphers/utils.js";
import { poseidonHash } from "nexus-crypto";
import type { ShieldedWallet } from "../shielded";

export class Note {
    readonly owner: bigint;
    amount: bigint;
    readonly salt: bigint;
    readonly index?: number;

    constructor(params: {
        owner: bigint;
        amount: bigint;
        salt?: bigint;
        index?: number;
    }) {
        let salt = params.salt;
        if (!salt) {
            salt = bytesToNumberBE(randomBytes(24));
        }

        this.owner = params.owner;
        this.amount = params.amount;
        this.salt = salt;
        this.index = params.index;
    }

    commitment(): bigint {
        return poseidonHash([this.owner, this.amount, this.salt]);
    }

    nullifier(): bigint {
        console.log({ note: this });
        if (!Number.isFinite(this.index)) {
            throw new Error("Note index required for nullifier");
        }
        return poseidonHash([this.commitment(), BigInt(this.index as number)]);
    }

    memo(viewKey: Uint8Array): Uint8Array {
        const plainText = concatBytes(
            numberToBytesBE(this.amount, 31),
            numberToBytesBE(this.salt, 24),
        );
        const cipher = managedNonce(xchacha20poly1305)(viewKey);
        const ciphertext = cipher.encrypt(plainText);
        return ciphertext as Uint8Array;
    }

    static fromMemo(memoBytes: Uint8Array, shieldedWallet: ShieldedWallet): Note | null {
        try {
            const cipher = managedNonce(xchacha20poly1305)(shieldedWallet.viewKey);
            const plainText = cipher.decrypt(memoBytes);
            if (plainText.length !== 63) {
                return null;
            }
            const amount = bytesToNumberBE(plainText.slice(0, 31));
            const salt = bytesToNumberBE(plainText.slice(31, 55));
            const nonce = bytesToNumberBE(plainText.slice(55, 63));
            return new Note({ owner: shieldedWallet.address, amount, salt });
        } catch (_e) {
            return null;
        }
    }

    static dummy(owner: bigint): Note {
        return new Note({
            owner,
            amount: 0n,
            salt: bytesToNumberBE(randomBytes(24)),
            nonce: 0n,
            index: 0,
        });
    }
}
