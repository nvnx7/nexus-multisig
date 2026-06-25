"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { babyjubjub } from "@noble/curves/misc.js";
import { hexToBytes } from "@noble/curves/utils.js";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { useCreateGroup } from "@/api/groups/createGroup";
import { getShieldedAddress } from "@/api/pool/getShieldedAddress";
import { encryptGvkFor, generateGroupViewKey } from "@/lib/groupViewKey";
import { computeMyFrostKey } from "@/lib/dkg";
import { saveFrostKey } from "@/lib/frostKeyStore";
import { bjj_FROST } from "nexus-crypto";
import { CompleteStep } from "./complete-step";

interface FinalizeStepProps {
  sessionId: string;
}

export function FinalizeStep({ sessionId }: FinalizeStepProps) {
  const { stellarAddress, shielded } = useWallet();
  const {
    data: session,
    isLoading: sessionLoading,
    error: sessionError,
  } = useGetDkgSession({
    sessionId,
    poll: true,
  });

  const createGroupMutation = useCreateGroup();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.group_id) {
      setGroupId(session.group_id);
    }
  }, [session?.group_id]);

  // Persist this member's DKG key as soon as the session completes, so any
  // member (not just the one who registers the group) can sign later.
  const savedKeyRef = useRef(false);
  useEffect(() => {
    if (savedKeyRef.current || !session || !stellarAddress) return;
    if (session.status !== "complete" || !session.round1_data[stellarAddress]) return;
    try {
      const { key, groupAddress } = computeMyFrostKey(
        session.round1_data,
        session.round2_data,
        stellarAddress,
      );
      saveFrostKey(groupAddress, stellarAddress, key);
      savedKeyRef.current = true;
    } catch {
      // round2 data not fully available yet
    }
  }, [session, stellarAddress]);

  const handleFinalize = async () => {
    if (!session || !stellarAddress || !shielded) return;
    try {
      setError(null);
      const { key, groupAddress } = computeMyFrostKey(
        session.round1_data,
        session.round2_data,
        stellarAddress,
      );
      saveFrostKey(groupAddress, stellarAddress, key);

      const groupPubKeyPoint = babyjubjub.Point.fromBytes(
        hexToBytes(key.public.commitments[0]),
      ).toAffine();
      const agg_pubkey: [string, string] = [
        groupPubKeyPoint.x.toString(),
        groupPubKeyPoint.y.toString(),
      ];

      const members = session.participants.map((p) => {
        const id = bjj_FROST.Identifier.derive(p.address);
        const shareHex = key.public.verifyingShares[id];
        if (shareHex) {
          const pt = babyjubjub.Point.fromBytes(
            hexToBytes(shareHex),
          ).toAffine();
          return {
            address: p.address,
            pubkey: [pt.x.toString(), pt.y.toString()] as [string, string],
          };
        }
        return {
          address: p.address,
          pubkey: ["0", "0"] as [string, string],
        };
      });

      // Generate the common view key and encrypt it to each member's personal
      // view key, so any member can later decrypt it from the group record.
      const gvk = generateGroupViewKey();
      const encryptedViewKeys: Record<string, string> = {};
      for (const p of session.participants) {
        const viewPubKey =
          p.address === stellarAddress
            ? shielded.shieldedAddress().viewPubKey
            : (await getShieldedAddress(p.address))?.viewPubKey;
        if (!viewPubKey) {
          throw new Error(
            `Member ${p.address} has not registered a shielded address`,
          );
        }
        encryptedViewKeys[p.address] = encryptGvkFor(gvk, {
          x: viewPubKey.x,
          y: viewPubKey.y,
        });
      }

      createGroupMutation.mutate({
        threshold: session.threshold,
        members,
        agg_pubkey,
        group_address: groupAddress,
        group_view_key: encryptedViewKeys,
        dkg_session_id: sessionId,
      });
    } catch (err) {
      console.error("Error finalizing DKG round 3:", err);
      setError(
        err instanceof Error ? err.message : "DKG Round 3 computation failed",
      );
    }
  };

  if (sessionLoading) {
    return (
      <Flex align="center" justify="center" py={12}>
        <Spinner size="lg" color="brand.solid" />
      </Flex>
    );
  }

  if (sessionError || !session) {
    return (
      <Flex
        direction="column"
        align="center"
        gap={4}
        py={12}
        textAlign="center"
      >
        <Box color="status.danger">
          <AlertCircle size={28} />
        </Box>
        <Text fontSize="sm" color="fg.default">
          Failed to load DKG session details
        </Text>
      </Flex>
    );
  }

  if (groupId) {
    return <CompleteStep groupId={groupId} />;
  }

  return (
    <Flex direction="column" gap={6} w="full">
      <Flex direction="column" align="center" gap={4} py={4} textAlign="center">
        {!createGroupMutation.isPending ? (
          <>
            <Box
              w={12}
              h={12}
              rounded="full"
              bg="brand.subtle"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="brand.solid"
              mb={1}
            >
              <CheckCircle size={22} />
            </Box>
            <Box>
              <Text
                fontFamily="heading"
                fontSize="md"
                fontWeight="semibold"
                color="fg.default"
              >
                Finalize & register vault
              </Text>
              <Text
                fontFamily="body"
                fontSize="xs"
                color="fg.muted"
                mt={1}
                maxW="sm"
                mx="auto"
                lineHeight="relaxed"
              >
                All rounds are complete. Perform the final threshold key checks
                and register the multisig vault.
              </Text>
            </Box>
            <Button
              onClick={handleFinalize}
              loading={createGroupMutation.isPending}
              loadingText="Registering..."
              px={8}
            >
              Finalize & Register Vault
            </Button>
            {error && (
              <Text color="status.danger" fontSize="xs" mt={2} maxW="sm">
                {error}
              </Text>
            )}
          </>
        ) : (
          <>
            <Spinner size="lg" color="brand.solid" />
            <Box>
              <Text
                fontFamily="heading"
                fontSize="md"
                fontWeight="semibold"
                color="fg.default"
              >
                Registering vault…
              </Text>
              <Text
                fontFamily="body"
                fontSize="xs"
                color="fg.muted"
                mt={1}
                maxW="sm"
                mx="auto"
                lineHeight="relaxed"
              >
                Generating group public key, deriving verifying shares, and
                registering the vault group details.
              </Text>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}
