"use client";

import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { Check } from "lucide-react";
import { useGetSignSession } from "@/api/sign-sessions/getSignSession";
import { DetailRow } from "./detail-row";
import { TX_META, txAmount, txRecipient, txRecipientLabel } from "./tx-display";

function sessionStatusMeta(status: string, done: boolean) {
  if (done) return { label: "Completed", palette: "green", live: false };
  switch (status) {
    case "collecting_commits":
      return { label: "Collecting commitments", palette: "orange", live: true };
    case "collecting_shares":
      return { label: "Collecting signatures", palette: "blue", live: true };
    case "complete":
      return { label: "Finalizing", palette: "green", live: true };
    default:
      return { label: status.replace(/_/g, " "), palette: "gray", live: true };
  }
}

function StatusPill({
  label,
  palette,
  live,
  done,
}: {
  label: string;
  palette: string;
  live: boolean;
  done: boolean;
}) {
  return (
    <Flex
      align="center"
      gap={2}
      px={2.5}
      py={1}
      rounded="full"
      bg={`${palette}.50`}
      borderWidth={1}
      borderColor={`${palette}.200`}
      flexShrink={0}
    >
      {done ? (
        <Box color={`${palette}.600`} display="flex">
          <Check size={11} strokeWidth={3} />
        </Box>
      ) : (
        <Box
          w={1.5}
          h={1.5}
          rounded="full"
          bg={`${palette}.500`}
          animation={live ? "nexus-pulse 1.6s ease-in-out infinite" : undefined}
        />
      )}
      <Text
        fontFamily="body"
        fontSize="2xs"
        fontWeight="semibold"
        color={`${palette}.700`}
        letterSpacing="0.01em"
        whiteSpace="nowrap"
      >
        {label}
      </Text>
    </Flex>
  );
}

export function TransactionSummaryCard({
  vaultAddress,
  sessionId,
}: {
  vaultAddress: string;
  sessionId: string;
}) {
  const { data: session, isLoading } = useGetSignSession(sessionId, {
    poll: true,
  });

  if (isLoading || !session) {
    return (
      <Flex justify="center" py={10} mb={4}>
        <Spinner size="md" color="brand.solid" />
      </Flex>
    );
  }

  const d = session.tx_details;
  const done = session.status === "complete" && !!session.sig_s;
  const meta = TX_META[d.type] ?? TX_META.deposit!;
  const status = sessionStatusMeta(session.status, done);

  return (
    <Box
      borderWidth={1}
      borderColor="border.default"
      rounded="2xl"
      bg="bg.default"
      boxShadow="surface"
      overflow="hidden"
      mb={4}
    >
      {/* ── Header ── */}
      <Flex align="center" justify="space-between" gap={3} px={5} py={4}>
        <Flex align="center" gap={3} minW={0}>
          <Flex
            w={10}
            h={10}
            rounded="xl"
            align="center"
            justify="center"
            bg={`${meta.color}.50`}
            color={`${meta.color}.600`}
            flexShrink={0}
          >
            {meta.icon}
          </Flex>
          <Text fontFamily="heading" fontSize="md" fontWeight="semibold" color="fg.default">
            {meta.label}
          </Text>
        </Flex>
        <StatusPill label={status.label} palette={status.palette} live={status.live} done={done} />
      </Flex>

      {/* ── Amount hero ── */}
      <Flex
        direction="column"
        align="center"
        gap={1}
        py={7}
        px={6}
        bg="bg.subtle"
        borderTopWidth={1}
        borderBottomWidth={1}
        borderColor="border.subtle"
      >
        <Text
          fontFamily="mono"
          fontSize="9px"
          letterSpacing="0.18em"
          textTransform="uppercase"
          color="fg.subtle"
        >
          Amount
        </Text>
        <Flex align="baseline" gap={2}>
          <Text
            fontFamily="heading"
            fontSize="5xl"
            fontWeight="bold"
            color="fg.default"
            letterSpacing="-0.03em"
            lineHeight={1}
          >
            {txAmount(d)}
          </Text>
          <Text fontFamily="mono" fontSize="md" fontWeight="medium" color="fg.muted">
            XLM
          </Text>
        </Flex>
        <Text fontFamily="body" fontSize="xs" color="fg.muted">
          {meta.label} · {txRecipientLabel(d).replace(/^To /, "to ")}
        </Text>
      </Flex>

      {/* ── Details ── */}
      <Box px={5} py={1}>
        <DetailRow label={txRecipientLabel(d)} value={txRecipient(d, vaultAddress)} copyable />
        <DetailRow label="Proposed by" value={session.proposer} copyable />
        <DetailRow label="Transaction" value={session.tx_hash} copyable />
      </Box>
    </Box>
  );
}
