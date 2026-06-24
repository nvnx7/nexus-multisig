import { dkgRound1, dkgRound2, dkgRound3, bjj_FROST } from "nexus-crypto";
import type { DKG_Round2 } from "@noble/curves/abstract/frost.js";

/**
 * Helper to perform a full 2-of-3 FROST DKG setup using the native (unserialized)
 * round API. Returns the generated keys for all participants plus their ids.
 */
export async function setupDKG() {
    const threshold = 2;
    const total = 3;
    const aliceAddr = "alice";
    const bobAddr = "bob";
    const carolAddr = "carol";

    // ROUND 1
    const aliceR1 = dkgRound1({ address: aliceAddr, threshold, total });
    const bobR1 = dkgRound1({ address: bobAddr, threshold, total });
    const carolR1 = dkgRound1({ address: carolAddr, threshold, total });

    const othersForAlice1 = [bobR1.public, carolR1.public];
    const othersForBob1 = [aliceR1.public, carolR1.public];
    const othersForCarol1 = [aliceR1.public, bobR1.public];

    // ROUND 2
    const aliceR2 = dkgRound2({ myRound1Secret: aliceR1.secret, othersRound1Public: othersForAlice1 });
    const bobR2 = dkgRound2({ myRound1Secret: bobR1.secret, othersRound1Public: othersForBob1 });
    const carolR2 = dkgRound2({ myRound1Secret: carolR1.secret, othersRound1Public: othersForCarol1 });

    const aliceIdStr = bjj_FROST.Identifier.derive(aliceAddr);
    const bobIdStr = bjj_FROST.Identifier.derive(bobAddr);
    const carolIdStr = bjj_FROST.Identifier.derive(carolAddr);

    const aliceR2Received = [bobR2[aliceIdStr], carolR2[aliceIdStr]] as DKG_Round2[];
    const bobR2Received = [aliceR2[bobIdStr], carolR2[bobIdStr]] as DKG_Round2[];
    const carolR2Received = [aliceR2[carolIdStr], bobR2[carolIdStr]] as DKG_Round2[];

    // ROUND 3
    const aliceKey = dkgRound3({
        myRound1Secret: aliceR1.secret,
        othersRound1Public: othersForAlice1,
        othersRound2Public: aliceR2Received,
    });
    const bobKey = dkgRound3({
        myRound1Secret: bobR1.secret,
        othersRound1Public: othersForBob1,
        othersRound2Public: bobR2Received,
    });
    const carolKey = dkgRound3({
        myRound1Secret: carolR1.secret,
        othersRound1Public: othersForCarol1,
        othersRound2Public: carolR2Received,
    });

    const groupPublicKey = aliceKey.public.commitments[0];

    return {
        aliceKey,
        bobKey,
        carolKey,
        groupPublicKey,
        aliceIdStr,
        bobIdStr,
        carolIdStr
    };
}
