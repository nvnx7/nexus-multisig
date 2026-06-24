"use client";

import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { CheckCircle, Copy, AlertCircle } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { useSubmitDkgRound1 } from "@/api/dkg/submitRound1";
import { dkgRound1, serializeDkgRound1 } from "nexus-crypto";

interface CommitStepProps {
  sessionId: string;
}

function CopyButton({ text }: { text: string }) {
  const copy = () => navigator.clipboard.writeText(text).catch(() => {});
  return (
    <Button
      size="xs"
      onClick={copy}
      aria-label="Copy"
      display="flex"
      h="auto"
    >
      <Copy size={11} />
      Copy
    </Button>
  );
}

export function CommitStep({ sessionId }: CommitStepProps) {
  const { stellarAddress } = useWallet();
  const { data: session, isLoading: sessionLoading, error: sessionError } = useGetDkgSession({
    sessionId,
    poll: true,
  });

  const submitR1 = useSubmitDkgRound1();

  const handleSubmit = () => {
    if (!session || !stellarAddress) return;
    try {
      const threshold = session.threshold;
      const total = session.total;
      const round1Result = serializeDkgRound1(
        dkgRound1({
          address: stellarAddress,
          threshold,
          total,
        }),
      );

      submitR1.mutate({
        sessionId,
        address: stellarAddress,
        round1Data: round1Result,
      });
    } catch (err) {
      console.error("Error generating round 1 DKG payload:", err);
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

  const hasCommitted = stellarAddress ? !!session.round1_data[stellarAddress] : false;
  const count = session.round1_count;
  const total = session.total;
  const progressPct = total > 0 ? Math.round((count / total) * 100) : 0;
  const isSubmitting = submitR1.isPending;

  return (
    <Flex direction="column" gap={6} w="full">
      {/* Header */}
      <Flex direction="column" align="center" gap={4} py={4} textAlign="center">
        {!hasCommitted ? (
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
                Submit key commitment
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Generate and submit your cryptographic key commitment to participate in the vault.
              </Text>
            </Box>
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              loadingText="Submitting..."
              px={8}
            >
              Generate & Submit
            </Button>
            {submitR1.error && (
              <Text color="status.danger" fontSize="xs">
                {submitR1.error instanceof Error ? submitR1.error.message : "Submission failed"}
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

      {/* Session ID */}
      <Flex direction="column" gap={1.5}>
        <Text fontFamily="body" fontSize="2xs" textTransform="uppercase" letterSpacing="widest" color="fg.muted">
          Session ID
        </Text>
        <Flex align="center" gap={2} py={2} px={3} rounded="md" bg="bg.subtle">
          <Text fontFamily="mono" fontSize="xs" color="fg.default" flex={1} truncate>
            {sessionId}
          </Text>
          <CopyButton text={sessionId} />
        </Flex>
      </Flex>

      {/* Progress */}
      {total > 0 && (
        <Flex direction="column" gap={2}>
          <Flex justify="space-between" align="center">
            <Text fontFamily="body" fontSize="xs" color="fg.muted">
              Commitments received
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
            const hasCommitted = !!session.round1_data[p.address];
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
                {hasCommitted ? (
                  <Box color="status.success" flexShrink={0}>
                    <CheckCircle size={16} />
                  </Box>
                ) : (
                  <Spinner size="xs" color="fg.muted" flexShrink={0} />
                )}
              </Flex>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}
