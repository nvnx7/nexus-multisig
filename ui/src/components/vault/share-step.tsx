"use client";

import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { useSubmitDkgRound2 } from "@/api/dkg/submitRound2";
import {
  dkgRound2,
  serializeDkgRound2,
  deserializeDkgRound1,
} from "nexus-crypto";

interface ShareStepProps {
  sessionId: string;
}

export function ShareStep({ sessionId }: ShareStepProps) {
  const { stellarAddress } = useWallet();
  const { data: session, isLoading: sessionLoading, error: sessionError } = useGetDkgSession({
    sessionId,
    poll: true,
  });

  const submitR2 = useSubmitDkgRound2();

  const handleSubmit = () => {
    if (!session || !stellarAddress) return;
    try {
      const serializedRound1 = session.round1_data[stellarAddress];
      if (!serializedRound1) {
        throw new Error("My round 1 data is missing from DKG session!");
      }

      const deserializedRound1 = deserializeDkgRound1(serializedRound1);
      const myRound1Secret = deserializedRound1.secret;

      const othersRound1Public = Object.entries(session.round1_data)
        .filter(([addr]) => addr !== stellarAddress)
        .map(([_, r1]) => deserializeDkgRound1(r1 as any).public);

      const round2Result = serializeDkgRound2(
        dkgRound2({
          myRound1Secret,
          othersRound1Public,
        }),
      );

      submitR2.mutate({
        sessionId,
        address: stellarAddress,
        round2Data: round2Result,
      });
    } catch (err) {
      console.error("Error generating round 2 DKG shares:", err);
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

  const count = session.round2_count;
  const total = session.total;
  const progressPct = total > 0 ? Math.round((count / total) * 100) : 0;
  const isSubmitting = submitR2.isPending;
  const hasSubmitted = stellarAddress ? !!session.round2_data[stellarAddress] : false;

  return (
    <Flex direction="column" gap={6} w="full">
      {/* Header */}
      <Flex direction="column" align="center" gap={4} py={4} textAlign="center">
        {!hasSubmitted ? (
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
                Submit threshold key shares
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Generate and exchange encrypted threshold key shares with other participants.
              </Text>
            </Box>
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              loadingText="Submitting..."
              px={8}
            >
              Generate & Submit Shares
            </Button>
            {submitR2.error && (
              <Text color="status.danger" fontSize="xs">
                {submitR2.error instanceof Error ? submitR2.error.message : "Submission failed"}
              </Text>
            )}
          </>
        ) : (
          <>
            <Box
              w={12}
              h={12}
              rounded="full"
              bg="status.successBg"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="status.success"
              mb={1}
            >
              <CheckCircle size={22} />
            </Box>
            <Box>
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Submitted
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Submitted. Waiting for other members if any, or moving to the next step if all are submitted now.
              </Text>
            </Box>
            <Flex align="center" gap={2} mt={1}>
              <Spinner size="xs" color="brand.solid" />
              <Text fontSize="2xs" color="fg.muted" fontWeight="medium">
                {count === total ? "All submitted. Transitioning..." : `Waiting for other members (${count}/${total} joined)`}
              </Text>
            </Flex>
          </>
        )}
      </Flex>

      {/* Progress */}
      {total > 0 && (
        <Flex direction="column" gap={2}>
          <Flex justify="space-between" align="center">
            <Text fontFamily="body" fontSize="xs" color="fg.muted">
              Shares submitted
            </Text>
            <Text fontFamily="body" fontSize="xs" fontWeight="medium" color="fg.default">
              {count} / {total}
            </Text>
          </Flex>
          <Box h={1.5} w="full" rounded="full" bg="border.default" overflow="hidden">
            <Box
              h="full"
              rounded="full"
              bg="brand.solid"
              transition="width 0.5s ease"
              style={{ width: `${progressPct}%` }}
            />
          </Box>
        </Flex>
      )}

      {/* Participants Checklist */}
      {session.participants.length > 0 && (
        <Flex direction="column" gap={1.5}>
          <Text fontFamily="body" fontSize="2xs" textTransform="uppercase" letterSpacing="widest" color="fg.muted">
            Participants ({session.participants.length})
          </Text>
          {session.participants.map((p, i) => {
            const hasSubmittedR2 = !!session.round2_data[p.address];
            return (
              <Flex key={p.address} align="center" gap={3} py={2} px={3} rounded="md" bg="bg.subtle">
                <Text fontFamily="mono" fontSize="2xs" color="fg.muted" w={4} flexShrink={0}>
                  {i + 1}
                </Text>
                <Text fontFamily="mono" fontSize="xs" color="fg.default" truncate flex={1}>
                  {p.address === stellarAddress
                    ? `${p.address.slice(0, 12)}…${p.address.slice(-8)} (You)`
                    : `${p.address.slice(0, 12)}…${p.address.slice(-8)}`}
                </Text>
                {hasSubmittedR2 ? (
                  <Box color="status.success" flexShrink={0}>
                    <CheckCircle size={16} />
                  </Box>
                ) : (
                  <Spinner size="sm" color="fg.muted" flexShrink={0} />
                )}
              </Flex>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}
