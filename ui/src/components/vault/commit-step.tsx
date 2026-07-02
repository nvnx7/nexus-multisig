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
      variant="ghost"
      onClick={copy}
      aria-label="Copy"
      color="fg.muted"
      _hover={{ color: "fg.default" }}
      gap={1}
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
          Failed to load vault setup details
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
    <Flex direction="column" gap={7} w="full">
      {/* Step title */}
      <Box>
        <Text fontFamily="heading" fontSize="lg" fontWeight="semibold" color="fg.default" mb={1}>
          Security Key
        </Text>
        <Text fontFamily="body" fontSize="sm" color="fg.muted" lineHeight="relaxed">
          Each member generates and submits their unique security key to participate in the vault.
        </Text>
      </Box>

      {/* Main action / status */}
      <Flex direction="column" align="center" gap={4} py={4} textAlign="center">
        {!hasCommitted ? (
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
              <CheckCircle size={26} />
            </Flex>
            <Box>
              <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
                Generate your security key
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Your unique security key enables your participation in authorizing transactions from this vault.
              </Text>
            </Box>
            <Button
              onClick={handleSubmit}
              loading={isSubmitting}
              loadingText="Submitting…"
              px={8}
              gap={2}
            >
              <CheckCircle size={15} />
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
                Security key submitted
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1} maxW="sm" mx="auto" lineHeight="relaxed">
                Your key is in. Waiting for other members to submit theirs.
              </Text>
            </Box>
            <Flex align="center" gap={2} mt={1}>
              <Spinner size="xs" color="brand.solid" />
              <Text fontSize="2xs" color="fg.muted" fontWeight="medium">
                {count === total
                  ? "All members joined. Moving to next step…"
                  : `Waiting for members · ${count} of ${total} joined`}
              </Text>
            </Flex>
          </>
        )}
      </Flex>

      {/* Share session ID */}
      <Flex direction="column" gap={1.5}>
        <Text fontFamily="body" fontSize="2xs" textTransform="uppercase" letterSpacing="widest" color="fg.muted" fontWeight="semibold">
          Share with vault members
        </Text>
        <Flex align="center" gap={2} py={2.5} px={3} rounded="lg" bg="bg.subtle" borderWidth={1} borderColor="border.default">
          <Text fontFamily="mono" fontSize="xs" color="fg.default" flex={1} truncate>
            {sessionId}
          </Text>
          <CopyButton text={sessionId} />
        </Flex>
        <Text fontFamily="body" fontSize="2xs" color="fg.subtle">
          Other members need this ID to join the vault setup.
        </Text>
      </Flex>

      {/* Progress bar */}
      {total > 0 && (
        <Flex direction="column" gap={2}>
          <Flex justify="space-between" align="center">
            <Text fontFamily="body" fontSize="xs" color="fg.muted">
              Members joined
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
              const committed = !!session.round1_data[p.address];
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
                  {committed ? (
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
