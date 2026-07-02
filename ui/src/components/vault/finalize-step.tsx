"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { AlertCircle, CheckCircle, Zap } from "lucide-react";
import { babyjubjub } from "@noble/curves/misc.js";
import { hexToBytes } from "@noble/curves/utils.js";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { useCreateGroup } from "@/api/groups/createGroup";
import { getShieldedAddress } from "@/api/pool/getShieldedAddress";
import { encryptGvkFor, generateGroupViewKey } from "nexus-crypto";
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

  // Persist this member's key as soon as the session completes so any member
  // (not just the one who registers the group) can sign later.
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
      console.error("Error finalizing vault setup:", err);
      setError(
        err instanceof Error ? err.message : "Vault activation failed",
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
      <Flex direction="column" align="center" gap={4} py={12} textAlign="center">
        <Box color="status.danger">
          <AlertCircle size={28} />
        </Box>
        <Text fontSize="sm" color="fg.default">
          Failed to load vault setup details
        </Text>
      </Flex>
    );
  }

  if (groupId) {
    return <CompleteStep groupId={groupId} />;
  }

  return (
    <Flex direction="column" gap={7} w="full">
      {/* Step title */}
      <Box>
        <Text fontFamily="heading" fontSize="lg" fontWeight="semibold" color="fg.default" mb={1}>
          Activate Vault
        </Text>
        <Text fontFamily="body" fontSize="sm" color="fg.muted" lineHeight="relaxed">
          All members have contributed. Complete the final step to activate your new multi-party vault.
        </Text>
      </Box>

      {/* Main action / status */}
      <Flex direction="column" align="center" gap={4} py={4} textAlign="center">
        {!createGroupMutation.isPending ? (
          <>
            <Flex
              w={14}
              h={14}
              rounded="full"
              bg="brand.subtle"
              align="center"
              justify="center"
              color="brand.solid"
            >
              <Zap size={26} />
            </Flex>
            <Box>
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Ready to activate
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Compute the group approval key and register your vault. This only needs to be done by one member.
              </Text>
            </Box>
            <Button
              onClick={handleFinalize}
              loading={createGroupMutation.isPending}
              loadingText="Activating…"
              px={8}
              gap={2}
            >
              <Zap size={14} />
              Activate Vault
            </Button>
            {error && (
              <Flex align="center" gap={2} py={2.5} px={3} rounded="lg" bg="status.dangerBg" borderWidth={1} borderColor="status.danger" maxW="sm">
                <Text fontFamily="body" fontSize="xs" color="status.danger" textAlign="left">
                  {error}
                </Text>
              </Flex>
            )}
          </>
        ) : (
          <>
            <Flex
              w={14}
              h={14}
              rounded="full"
              bg="brand.subtle"
              align="center"
              justify="center"
              color="brand.solid"
            >
              <Spinner size="lg" color="brand.solid" />
            </Flex>
            <Box>
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Activating your vault…
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Computing group approval keys and registering your vault on the network.
              </Text>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}
