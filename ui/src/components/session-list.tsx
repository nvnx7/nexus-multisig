"use client";

import { Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { Clock, ArrowRight } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import {
  UserDkgSessionSummary,
  useGetUserDkgSessions,
} from "@/api/dkg/getUserDkgSessions";

function SessionCard({ session }: { session: UserDkgSessionSummary }) {
  const router = useRouter();
  const label =
    session.status === "round1"
      ? "Waiting for commitments"
      : session.status === "round2"
        ? "Exchanging shares"
        : "Finalizing vault";

  return (
    <Button
      onClick={() => router.push(`/vault/new/${session.id}`)}
      w="full"
      justifyContent="flex-start"
      textAlign="left"
      h="auto"
      py={3}
    >
      <Flex as="span" color="fg.muted" flexShrink={0}>
        <Clock size={14} />
      </Flex>
      <Flex as="span" direction="column" gap={0.5} flex={1} minW={0} textAlign="left">
        <Text as="span" fontFamily="mono" fontSize="xs" color="fg.default" truncate>
          {session.id.slice(0, 16)}…
        </Text>
        <Text as="span" fontFamily="body" fontSize="2xs" color="fg.muted">
          {label}
        </Text>
      </Flex>
      <Flex as="span" color="fg.muted" flexShrink={0}>
        <ArrowRight size={14} />
      </Flex>
    </Button>
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
    <Flex direction="column" gap={2}>
      <Text
        as="h2"
        fontFamily="heading"
        fontSize="sm"
        fontWeight="medium"
        color="fg.default"
      >
        In progress
      </Text>
      <Flex direction="column" gap={1.5}>
        {sessions.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
      </Flex>
    </Flex>
  );
}
