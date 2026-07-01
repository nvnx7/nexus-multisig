"use client";

import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import {
  UserDkgSessionSummary,
  useGetUserDkgSessions,
} from "@/api/dkg/getUserDkgSessions";

const STATUS_LABEL: Record<UserDkgSessionSummary["status"], string> = {
  round1: "Collecting commitments",
  round2: "Exchanging key shares",
  complete: "Finalizing vault",
};

const STATUS_COLOR: Record<UserDkgSessionSummary["status"], string> = {
  round1: "status.warning",
  round2: "brand.solid",
  complete: "status.success",
};

function SessionCard({ session }: { session: UserDkgSessionSummary }) {
  const router = useRouter();
  const label = STATUS_LABEL[session.status] ?? "In progress";
  const dotColor = STATUS_COLOR[session.status] ?? "fg.muted";
  const shortId = `${session.id.slice(0, 8)}…${session.id.slice(-6)}`;

  return (
    <Box
      borderWidth="1px"
      borderColor="border.default"
      rounded="xl"
      bg="bg.default"
      cursor="pointer"
      transition="border-color 0.15s, background 0.15s"
      _hover={{ borderColor: "border.emphasis", bg: "bg.subtle" }}
      onClick={() => router.push(`/vault/new/${session.id}`)}
    >
      <Flex align="center" gap={3.5} px={4} py={3.5}>
        {/* Status dot */}
        <Box
          w={2}
          h={2}
          bg={dotColor}
          borderRadius="full"
          flexShrink={0}
          mt="1px"
        />

        {/* Info */}
        <Flex direction="column" gap={0.5} flex={1} minW={0}>
          <Text fontFamily="mono" fontSize="xs" color="fg.default" fontWeight="medium" truncate>
            {shortId}
          </Text>
          <Text fontFamily="body" fontSize="2xs" color="fg.muted">
            {label}
          </Text>
        </Flex>

        {/* Arrow */}
        <Box color="fg.muted" flexShrink={0}>
          <ArrowRight size={14} />
        </Box>
      </Flex>
    </Box>
  );
}

export function SessionList() {
  const { stellarAddress } = useWallet();
  const { data: sessions = [], isLoading } = useGetUserDkgSessions({
    address: stellarAddress || undefined,
  });

  if (isLoading) {
    return (
      <Flex align="center" justify="center" py={4}>
        <Spinner size="sm" color="brand.solid" />
      </Flex>
    );
  }

  if (!sessions.length) return null;

  return (
    <Flex direction="column" gap={3}>
      <Flex align="center" justify="space-between">
        <Text
          fontFamily="heading"
          fontSize="lg"
          fontWeight="semibold"
          letterSpacing="-0.01em"
          color="fg.default"
        >
          New Vault Requests
        </Text>
        <Text
          fontFamily="mono"
          fontSize="2xs"
          color="fg.muted"
          bg="bg.subtle"
          borderWidth="1px"
          borderColor="border.default"
          px={2}
          py={0.5}
          borderRadius="full"
        >
          {sessions.length}
        </Text>
      </Flex>

      <Flex direction="column" gap={2}>
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </Flex>
    </Flex>
  );
}
