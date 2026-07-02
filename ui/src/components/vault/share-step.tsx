"use client";

import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { CheckCircle, Share2, AlertCircle } from "lucide-react";
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
          Failed to load vault setup details
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
    <Flex direction="column" gap={7} w="full">
      {/* Step title */}
      <Box>
        <Text fontFamily="heading" fontSize="lg" fontWeight="semibold" color="fg.default" mb={1}>
          Sign Share
        </Text>
        <Text fontFamily="body" fontSize="sm" color="fg.muted" lineHeight="relaxed">
          Securely exchange the signing shares with other members.
        </Text>
      </Box>

      {/* Main action / status */}
      <Flex direction="column" align="center" gap={4} py={4} textAlign="center">
        {!hasSubmitted ? (
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
              <Share2 size={24} />
            </Flex>
            <Box>
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Submit your signing share
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Your signing share is distributed to other members so the vault can collectively authorize transactions.
              </Text>
            </Box>
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              loadingText="Submitting…"
              px={8}
              gap={2}
            >
              <Share2 size={14} />
              Submit Signing Share
            </Button>
            {submitR2.error && (
              <Text color="status.danger" fontSize="xs">
                {submitR2.error instanceof Error ? submitR2.error.message : "Submission failed"}
              </Text>
            )}
          </>
        ) : (
          <>
            <Flex
              w={14}
              h={14}
              rounded="full"
              bg="status.successBg"
              align="center"
              justify="center"
              color="status.success"
            >
              <CheckCircle size={26} />
            </Flex>
            <Box>
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Share submitted
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Your signing share is in. Waiting for other members to submit theirs.
              </Text>
            </Box>
            <Flex align="center" gap={2} mt={1}>
              <Spinner size="xs" color="brand.solid" />
              <Text fontSize="2xs" color="fg.muted" fontWeight="medium">
                {count === total
                  ? "All shares in. Moving to next step…"
                  : `Waiting for members · ${count} of ${total} submitted`}
              </Text>
            </Flex>
          </>
        )}
      </Flex>

      {/* Progress bar */}
      {total > 0 && (
        <Flex direction="column" gap={2}>
          <Flex justify="space-between" align="center">
            <Text fontFamily="body" fontSize="xs" color="fg.muted">
              Shares Submitted
            </Text>
            <Text fontFamily="body" fontSize="xs" fontWeight="semibold" color="fg.default">
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

      {/* Participant checklist */}
      {session.participants.length > 0 && (
        <Flex direction="column" gap={2}>
          <Text fontFamily="body" fontSize="2xs" textTransform="uppercase" letterSpacing="widest" color="fg.muted" fontWeight="semibold">
            Participants · {session.participants.length}
          </Text>
          <Flex direction="column" gap={1.5}>
            {session.participants.map((p, i) => {
              const hasSubmittedR2 = !!session.round2_data[p.address];
              const isSelf = p.address === stellarAddress;
              return (
                <Flex
                  key={p.address}
                  align="center"
                  gap={3}
                  py={2.5}
                  px={3}
                  rounded="lg"
                  bg="bg.subtle"
                  borderWidth={1}
                  borderColor="border.default"
                >
                  <Text fontFamily="mono" fontSize="2xs" color="fg.subtle" w={4} flexShrink={0}>
                    {i + 1}
                  </Text>
                  <Text fontFamily="mono" fontSize="xs" color="fg.default" truncate flex={1}>
                    {p.address.slice(0, 14)}…{p.address.slice(-8)}
                    {isSelf && (
                      <Text as="span" color="brand.solid" fontWeight="semibold">
                        {" · you"}
                      </Text>
                    )}
                  </Text>
                  {hasSubmittedR2 ? (
                    <Box color="status.success" flexShrink={0}>
                      <CheckCircle size={15} />
                    </Box>
                  ) : (
                    <Spinner size="xs" color="fg.subtle" flexShrink={0} />
                  )}
                </Flex>
              );
            })}
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}
