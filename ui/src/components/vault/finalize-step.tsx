"use client";

import { useEffect, useState } from "react";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { babyjubjub } from "@noble/curves/misc.js";
import { hexToBytes } from "@noble/curves/utils.js";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { useCreateGroup } from "@/api/groups/createGroup";
import {
  dkgRound3,
  serializeDkgRound3,
  deserializeDkgRound1,
  deserializeDkgRound2,
  bjj_FROST,
} from "nexus-crypto";
import { CompleteStep } from "./complete-step";

interface FinalizeStepProps {
  sessionId: string;
}

export function FinalizeStep({ sessionId }: FinalizeStepProps) {
  const { stellarAddress } = useWallet();
  const { data: session, isLoading: sessionLoading, error: sessionError } = useGetDkgSession({
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

  const handleFinalize = () => {
    if (!session || !stellarAddress) return;
    try {
      setError(null);
      const myRound1Secret = deserializeDkgRound1(session.round1_data[stellarAddress]).secret;
      
      const othersRound1Public = Object.entries(session.round1_data)
        .filter(([addr]) => addr !== stellarAddress)
        .map(([_, r1]) => deserializeDkgRound1(r1 as any).public);

      const myId = bjj_FROST.Identifier.derive(stellarAddress);

      const othersRound2Public = Object.entries(session.round2_data)
        .filter(([addr]) => addr !== stellarAddress)
        .map(([addr, r2]) => {
          const deserializedR2 = deserializeDkgRound2(r2 as any);
          const share = deserializedR2[myId];
          if (!share) {
            throw new Error(`Missing DKG Round 2 share from ${addr} for my identifier`);
          }
          return share;
        });

      const round3Result = serializeDkgRound3(
        dkgRound3({
          myRound1Secret,
          othersRound1Public,
          othersRound2Public,
        }),
      );

      const groupPubKeyBytes = hexToBytes(round3Result.public.commitments[0]);
      const groupPubKeyPoint = babyjubjub.Point.fromBytes(groupPubKeyBytes).toAffine();
      const agg_pubkey: [string, string] = [
        groupPubKeyPoint.x.toString(),
        groupPubKeyPoint.y.toString(),
      ];

      const members = session.participants.map((p) => {
        const id = bjj_FROST.Identifier.derive(p.address);
        const shareHex = round3Result.public.verifyingShares[id];
        if (shareHex) {
          const pt = babyjubjub.Point.fromBytes(hexToBytes(shareHex)).toAffine();
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

      createGroupMutation.mutate({
        threshold: session.threshold,
        members,
        agg_pubkey,
        dkg_session_id: sessionId,
      });
    } catch (err) {
      console.error("Error finalizing DKG round 3:", err);
      setError(err instanceof Error ? err.message : "DKG Round 3 computation failed");
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
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Finalize & register vault
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                All rounds are complete. Perform the final threshold key checks and register the multisig vault.
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
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Registering vault…
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Generating group public key, deriving verifying shares, and registering the vault group details.
              </Text>
            </Box>
          </>
        )}
      </Flex>
    </Flex>
  );
}
