"use client";

import { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useSignSession } from "@/hooks/useSignSession";
import { CopyButton } from "./copy-button";

export function CeremonyActionCard({
  vaultAddress,
  sessionId,
}: {
  vaultAddress: string;
  sessionId: string;
}) {
  const s = useSignSession(vaultAddress, sessionId);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const run = (fn: () => Promise<unknown>) => async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await fn();
    } catch (e) {
      console.error("[SignSession] action failed:", e);
      setLocalError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (!s.session) return null;

  const sess = s.session;
  const ncCount = Object.keys(sess.nonce_commitments).length;
  const scCount = Object.keys(sess.sig_shares).length;
  const done = sess.status === "complete" && !!sess.sig_s;

  let actionNode: React.ReactNode;
  let actionDescription: string | null = null;

  if (!s.isMember) {
    actionNode = null;
    actionDescription = "You are not a member of this vault.";
  } else if (done) {
    actionNode = (
      <Flex direction="column" align="center" gap={2}>
        <Flex align="center" gap={2} color="status.success">
          <CheckCircle2 size={20} />
          <Text fontWeight="semibold">Transaction sent</Text>
        </Flex>
        {s.txHash && (
          <Flex align="center" gap={1}>
            <Text fontFamily="mono" fontSize="xs" color="fg.muted">
              {s.txHash.slice(0, 12)}…{s.txHash.slice(-8)}
            </Text>
            <CopyButton value={s.txHash} />
          </Flex>
        )}
      </Flex>
    );
  } else if (s.canCommit) {
    actionDescription =
      "Review and verify the transaction details, then commit your nonce to begin the signing ceremony.";
    actionNode = (
      <Button onClick={run(s.commit)} loading={busy} size="lg" w="full">
        Review &amp; Commit
      </Button>
    );
  } else if (s.canSign) {
    actionDescription =
      "All commits collected. Produce your signature share to advance to the aggregation phase.";
    actionNode = (
      <Button onClick={run(s.sign)} loading={busy} size="lg" w="full">
        Sign
      </Button>
    );
  } else if (s.canAggregate) {
    actionDescription =
      "All signature shares collected. Aggregate them into a Schnorr signature and submit the transaction on-chain.";
    actionNode = (
      <Button onClick={run(s.aggregateAndSend)} loading={busy} size="lg" w="full">
        Aggregate &amp; Send
      </Button>
    );
  } else if (s.isCommitter && !s.hasSigned) {
    actionDescription = `Waiting for more commits (${ncCount}/${sess.threshold}).`;
    actionNode = null;
  } else if (s.hasSigned) {
    actionDescription = `Waiting for more signature shares (${scCount}/${sess.threshold}).`;
    actionNode = null;
  } else {
    actionDescription = "Waiting for the ceremony to advance…";
    actionNode = null;
  }

  return (
    <Box
      borderWidth={1}
      borderColor="border.default"
      rounded="xl"
      bg="bg.default"
      px={5}
      py={5}
    >
      {actionDescription && (
        <Text fontSize="xs" color="fg.muted" mb={actionNode ? 4 : 0} textAlign="center">
          {actionDescription}
        </Text>
      )}
      {actionNode}
      {(localError || s.error) && (
        <Flex align="center" gap={2} color="status.danger" mt={3} justify="center">
          <AlertCircle size={14} />
          <Text fontSize="xs">{localError || s.error}</Text>
        </Flex>
      )}
    </Box>
  );
}
