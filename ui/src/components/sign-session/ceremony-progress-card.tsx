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
    <Flex direction="column" align="center" gap={2} flexShrink={0} w={16}>
      <Box position="relative" w={9} h={9}>
        {/* Ping ring for the active phase */}
        {active && (
          <Box
            position="absolute"
            inset={0}
            rounded="full"
            bg="brand.solid"
            opacity={0.4}
            animation="nexus-ping 1.8s cubic-bezier(0,0,0.2,1) infinite"
          />
        )}
        <Flex
          position="relative"
          w={9}
          h={9}
          rounded="full"
          align="center"
          justify="center"
          bg={done ? "green.500" : active ? "brand.solid" : "bg.default"}
          color={done || active ? "white" : "fg.subtle"}
          fontFamily="mono"
          fontSize="xs"
          fontWeight="bold"
          borderWidth={done || active ? 0 : 1}
          borderColor="border.emphasized"
          boxShadow={done || active ? "surface" : undefined}
          transition="all 0.25s"
        >
          {done ? <Check size={15} strokeWidth={2.5} /> : number}
        </Flex>
      </Box>

      <Flex direction="column" align="center" gap={0.5}>
        <Text
          fontSize="xs"
          fontWeight={active ? "semibold" : "medium"}
          color={active ? "fg.default" : done ? "fg.muted" : "fg.subtle"}
          transition="color 0.2s"
        >
          {label}
        </Text>
        {count !== undefined && threshold !== undefined && (
          <Text
            fontFamily="mono"
            fontSize="9px"
            fontWeight="medium"
            color={active ? "brand.solid" : "fg.subtle"}
            px={1.5}
            py="1px"
            rounded="full"
            bg={active ? "brand.subtle" : "transparent"}
          >
            {count}/{threshold}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <Box
      flex={1}
      h="2px"
      mt="17px"
      mx={-1}
      rounded="full"
      bg={done ? "green.500" : "border.default"}
      transition="background-color 0.3s"
    />
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
  const dotColor = signed ? "green.500" : committed ? "blue.400" : "fg.subtle";

  return (
    <Flex
      align="center"
      gap={2}
      px={2.5}
      py={1.5}
      rounded="lg"
      bg={active ? "bg.subtle" : "bg.canvas"}
      borderWidth={1}
      borderColor={active ? "border.default" : "border.subtle"}
      transition="all 0.2s"
    >
      <Box position="relative" w={1.5} h={1.5} flexShrink={0}>
        {committed && !signed && (
          <Box
            position="absolute"
            inset={0}
            rounded="full"
            bg={dotColor}
            animation="nexus-ping 1.8s cubic-bezier(0,0,0.2,1) infinite"
          />
        )}
        <Box position="relative" w={1.5} h={1.5} rounded="full" bg={dotColor} />
      </Box>
      <Text fontFamily="mono" fontSize="10px" color={active ? "fg.default" : "fg.muted"}>
        {short}
      </Text>
      {isMe && (
        <Text fontFamily="body" fontSize="9px" fontWeight="medium" color="brand.solid">
          you
        </Text>
      )}
    </Flex>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Flex align="center" gap={1.5}>
      <Box w={1.5} h={1.5} rounded="full" bg={color} />
      <Text fontFamily="body" fontSize="10px" color="fg.subtle">
        {label}
      </Text>
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
      <Flex justify="center" py={6} mb={4}>
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
      rounded="2xl"
      bg="bg.default"
      boxShadow="surface"
      px={6}
      py={5}
      mb={4}
    >
      <Flex align="center" justify="space-between" mb={5}>
        <Text
          fontFamily="heading"
          fontSize="sm"
          fontWeight="semibold"
          color="fg.default"
        >
          Signing Progress
        </Text>
        <Text fontFamily="mono" fontSize="9px" letterSpacing="0.1em" textTransform="uppercase" color="fg.subtle">
          {session.threshold} signatures needed
        </Text>
      </Flex>

      {/* Phase tracker */}
      <Flex align="flex-start" px={2}>
        <PhaseStep
          number={1}
          label="Commit"
          count={ncCount}
          threshold={session.threshold}
          active={phase1Active}
          done={phase1Done}
        />
        <Connector done={phase1Done} />
        <PhaseStep
          number={2}
          label="Sign"
          count={scCount}
          threshold={session.threshold}
          active={phase2Active}
          done={phase2Done}
        />
        <Connector done={phase2Done} />
        <PhaseStep number={3} label="Execute" active={phase3Active} done={done} />
      </Flex>

      {/* Signers */}
      {!!members?.length && (
        <Box mt={6} pt={5} borderTopWidth={1} borderColor="border.subtle">
          <Flex align="center" justify="space-between" mb={3}>
            <Text
              fontFamily="body"
              fontSize="2xs"
              fontWeight="medium"
              textTransform="uppercase"
              letterSpacing="0.06em"
              color="fg.subtle"
            >
              Signers
            </Text>
            <Flex gap={3}>
              <LegendDot color="blue.400" label="Committed" />
              <LegendDot color="green.500" label="Signed" />
              <LegendDot color="fg.subtle" label="Pending" />
            </Flex>
          </Flex>
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
        </Box>
      )}
    </Box>
  );
}
