"use client";

import { Badge, Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { useGetSignSession } from "@/api/sign-sessions/getSignSession";
import { DetailRow } from "./detail-row";
import { TX_META, txAmount, txRecipient, txRecipientLabel } from "./tx-display";

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
      <Flex justify="center" py={6}>
        <Spinner size="md" color="brand.solid" />
      </Flex>
    );
  }

  const d = session.tx_details;
  const done = session.status === "complete" && !!session.sig_s;
  const meta = TX_META[d.type] ?? TX_META.deposit!;

  return (
    <>
      <Flex align="center" justify="space-between" mb={6}>
        <Flex align="center" gap={3}>
          <Flex
            w={10}
            h={10}
            rounded="xl"
            bg="bg.subtle"
            align="center"
            justify="center"
            color={`${meta.color}.500`}
          >
            {meta.icon}
          </Flex>
          <Box>
            <Text fontFamily="heading" fontSize="xl" fontWeight="semibold" color="fg.default">
              {meta.label}
            </Text>
            <Text fontFamily="mono" fontSize="xs" color="fg.muted">
              Session {session.id.slice(0, 8)}…
            </Text>
          </Box>
        </Flex>
        <Badge colorPalette={done ? "green" : session.status === "collecting_shares" ? "blue" : "gray"} size="md">
          {done ? "Completed" : session.status.replace(/_/g, " ")}
        </Badge>
      </Flex>

      <Box
        borderWidth={1}
        borderColor="border.default"
        rounded="xl"
        bg="bg.default"
        boxShadow="surface"
        px={6}
        py={5}
        mb={4}
      >
        <Text fontFamily="body" fontSize="xs" color="fg.muted" mb={1}>
          Amount
        </Text>
        <Text fontFamily="heading" fontSize="3xl" fontWeight="bold" color="fg.default" letterSpacing="tight">
          {txAmount(d)}{" "}
          <Text as="span" fontSize="lg" fontWeight="normal" color="fg.muted">
            XLM
          </Text>
        </Text>
      </Box>

      <Box
        borderWidth={1}
        borderColor="border.default"
        rounded="xl"
        bg="bg.default"
        boxShadow="surface"
        px={5}
        mb={4}
      >
        <DetailRow label={txRecipientLabel(d)} value={txRecipient(d, vaultAddress)} copyable />
        <DetailRow label="Proposed by" value={session.proposer} copyable />
        <DetailRow label="Session ID" value={session.id} copyable />
        <DetailRow label="Tx hash" value={session.tx_hash} copyable />
      </Box>
    </>
  );
}
