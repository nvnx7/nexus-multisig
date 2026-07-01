"use client";

import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import { useGetSignSession } from "@/api/sign-sessions/getSignSession";

function PhaseStep({
  number,
  label,
  count,
  threshold,
  active,
  done,
}: {
  number: number;
  label: string;
  count?: number;
  threshold?: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <Flex direction="column" align="center" gap={1.5} flex={1}>
      <Flex
        w={8}
        h={8}
        rounded="full"
        align="center"
        justify="center"
        bg={done ? "green.500" : active ? "brand.solid" : "bg.subtle"}
        color={done || active ? "white" : "fg.muted"}
        fontFamily="mono"
        fontSize="xs"
        fontWeight="bold"
        borderWidth={done || active ? 0 : 1}
        borderColor="border.default"
      >
        {done ? <Check size={14} /> : number}
      </Flex>
      <Text fontSize="xs" fontWeight={active ? "semibold" : "normal"} color={active ? "fg.default" : done ? "fg.muted" : "fg.subtle"}>
        {label}
      </Text>
      {count !== undefined && threshold !== undefined && (
        <Text fontSize="10px" color="fg.subtle">
          {count}/{threshold}
        </Text>
      )}
    </Flex>
  );
}

function MemberChip({
  address,
  committed,
  signed,
  isMe,
}: {
  address: string;
  committed: boolean;
  signed: boolean;
  isMe: boolean;
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  const active = committed || signed;
  return (
    <Flex align="center" gap={1.5} px={2.5} py={1} rounded="full" bg={active ? "bg.subtle" : "bg.canvas"} borderWidth={1} borderColor={active ? "border.default" : "border.subtle"}>
      <Box w={1.5} h={1.5} rounded="full" bg={signed ? "green.500" : committed ? "blue.400" : "fg.subtle"} />
      <Text fontFamily="mono" fontSize="10px" color={active ? "fg.default" : "fg.muted"}>
        {short}
      </Text>
      {isMe && (
        <Text fontSize="10px" color="fg.subtle">(you)</Text>
      )}
    </Flex>
  );
}

export function CeremonyProgressCard({
  vaultAddress,
  sessionId,
}: {
  vaultAddress: string;
  sessionId: string;
}) {
  const { stellarAddress } = useWallet();
  const { members } = useGroupShieldedWallet(vaultAddress);
  const { data: session, isLoading } = useGetSignSession(sessionId, {
    poll: true,
  });

  if (isLoading || !session) {
    return (
      <Flex justify="center" py={6}>
        <Spinner size="md" color="brand.solid" />
      </Flex>
    );
  }

  const ncCount = Object.keys(session.nonce_commitments).length;
  const scCount = Object.keys(session.sig_shares).length;
  const done = session.status === "complete" && !!session.sig_s;

  const phase1Done = session.status !== "collecting_commits";
  const phase2Done = session.status === "complete";
  const phase1Active = session.status === "collecting_commits";
  const phase2Active = session.status === "collecting_shares";
  const phase3Active = session.status === "complete" && !done;

  return (
    <Box
      borderWidth={1}
      borderColor="border.default"
      rounded="xl"
      bg="bg.default"
      boxShadow="surface"
      px={5}
      py={4}
      mb={4}
    >
      <Text fontSize="xs" fontWeight="semibold" color="fg.muted" mb={4} textTransform="uppercase" letterSpacing="wide">
        FROST Ceremony
      </Text>
      <Flex align="flex-start" gap={0}>
        <PhaseStep
          number={1}
          label="Commit"
          count={ncCount}
          threshold={session.threshold}
          active={phase1Active}
          done={phase1Done}
        />
        <Box flex={1} h="1px" bg={phase1Done ? "green.500" : "border.subtle"} mt={4} />
        <PhaseStep
          number={2}
          label="Sign"
          count={scCount}
          threshold={session.threshold}
          active={phase2Active}
          done={phase2Done}
        />
        <Box flex={1} h="1px" bg={phase2Done ? "green.500" : "border.subtle"} mt={4} />
        <PhaseStep
          number={3}
          label="Execute"
          active={phase3Active}
          done={done}
        />
      </Flex>

      {!!members?.length && (
        <Box mt={5} pt={4} borderTopWidth={1} borderColor="border.subtle">
          <Text fontSize="10px" color="fg.subtle" mb={2} textTransform="uppercase" letterSpacing="wide">
            Signers
          </Text>
          <Flex gap={2} flexWrap="wrap">
            {members.map((m) => (
              <MemberChip
                key={m.address}
                address={m.address}
                committed={m.address in session.nonce_commitments}
                signed={m.address in session.sig_shares}
                isMe={m.address === stellarAddress}
              />
            ))}
          </Flex>
          <Flex gap={4} mt={3}>
            <Flex align="center" gap={1.5}>
              <Box w={1.5} h={1.5} rounded="full" bg="blue.400" />
              <Text fontSize="10px" color="fg.subtle">Committed</Text>
            </Flex>
            <Flex align="center" gap={1.5}>
              <Box w={1.5} h={1.5} rounded="full" bg="green.500" />
              <Text fontSize="10px" color="fg.subtle">Signed</Text>
            </Flex>
            <Flex align="center" gap={1.5}>
              <Box w={1.5} h={1.5} rounded="full" bg="fg.subtle" />
              <Text fontSize="10px" color="fg.subtle">Pending</Text>
            </Flex>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
