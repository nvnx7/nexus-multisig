import type { Key } from "@noble/curves/abstract/frost.js";
import { babyjubjub } from "@noble/curves/misc.js";
import {
    frostCommit, frostSign, frostAggregate,
    type Point as BjjPoint
} from "nexus-crypto";

/**
 * Returns the group public key as an affine (x, y) point suitable for use in
 * schnorr_verify.circom. It is simply the first VSS commitment from DKG.
 */
export function getGroupPublicKey(key: Key): BjjPoint {
    const pk = babyjubjub.Point.fromBytes(
        key.public.commitments[0] as Uint8Array,
    ).toAffine();
    return { x: pk.x, y: pk.y };
}

/**
 * Performs circuit-compatible FROST signing using DKG key shares.
 * Returns a {s, e} signature verifiable by schnorr_verify.circom.
 */
export function signTransactWithDKG(
    msg: bigint,
    aliceKey: Key,
    bobKey: Key,
) {
    const aliceCommit = frostCommit(aliceKey.secret);
    const bobCommit = frostCommit(bobKey.secret);

    const commitmentList = [aliceCommit.commitments, bobCommit.commitments];

    const aliceSigShare = frostSign(aliceKey.secret, aliceKey.public, aliceCommit.nonces, commitmentList, msg);
    const bobSigShare = frostSign(bobKey.secret, bobKey.public, bobCommit.nonces, commitmentList, msg);

    return frostAggregate(aliceKey.public, commitmentList, msg, [aliceSigShare, bobSigShare]);
}
