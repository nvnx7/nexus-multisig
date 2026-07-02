"use client";

import { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { AlertCircle, CheckCircle2, Clock, Lock } from "lucide-react";
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

  // ── Terminal success state ────────────────────────────────────────────────
  if (done) {
    return (
      <Box
        borderWidth={1}
        borderColor="status.success"
        rounded="2xl"
        bg="status.successBg"
        boxShadow="surface"
        px={5}
        py={6}
      >
        <Flex direction="column" align="center" gap={3}>
          <Flex
            w={12}
            h={12}
            rounded="full"
            align="center"
            justify="center"
            bg="status.success"
            color="white"
          >
            <CheckCircle2 size={24} />
          </Flex>
          <Flex direction="column" align="center" gap={0.5}>
            <Text
              fontFamily="heading"
              fontSize="md"
              fontWeight="semibold"
              color="fg.default"
            >
              Transaction submitted
            </Text>
            <Text fontFamily="body" fontSize="xs" color="fg.muted">
              The transaction was executed successfully.
            </Text>
          </Flex>
          {s.txHash && (
            <Flex
              align="center"
              gap={1}
              px={3}
              py={1.5}
              rounded="lg"
              bg="bg.default"
              borderWidth={1}
              borderColor="border.default"
            >
              <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                {s.txHash.slice(0, 14)}…{s.txHash.slice(-10)}
              </Text>
              <CopyButton value={s.txHash} />
            </Flex>
          )}
        </Flex>
      </Box>
    );
  }

  // ── Determine current interactive state ───────────────────────────────────
  let heading: string;
  let icon: React.ReactNode;
  let tone: "action" | "waiting" | "locked";
  let actionNode: React.ReactNode = null;
  let actionDescription: string;

  if (!s.isMember) {
    heading = "Read only";
    icon = <Lock size={15} />;
    tone = "locked";
    actionDescription = "You are not a member of this vault.";
  } else if (s.canCommit) {
    heading = "Your turn";
    icon = <Clock size={15} />;
    tone = "action";
    actionDescription =
      "Review and verify the transaction details, then commit to it.";
    actionNode = (
      <Button onClick={run(s.commit)} loading={busy} size="lg" w="full">
        Commit
      </Button>
    );
  } else if (s.canSign) {
    heading = "Your turn";
    icon = <Clock size={15} />;
    tone = "action";
    actionDescription =
      "All commitments received. Now sign the transaction to proceed.";
    actionNode = (
      <Button onClick={run(s.sign)} loading={busy} size="lg" w="full">
        Sign
      </Button>
    );
  } else if (s.canAggregate) {
    heading = "Final step";
    icon = <Clock size={15} />;
    tone = "action";
    actionDescription =
      "All signatures collected. Ready to execute the transaction on-chain.";
    actionNode = (
      <Button
        onClick={run(s.aggregateAndSend)}
        loading={busy}
        size="lg"
        w="full"
      >
        Execute
      </Button>
    );
  } else if (s.isCommitter && !s.hasSigned) {
    heading = "Waiting";
    icon = <Clock size={15} />;
    tone = "waiting";
    actionDescription = `Waiting for more commits (${ncCount}/${sess.threshold}).`;
  } else if (s.hasSigned) {
    heading = "Waiting";
    icon = <Clock size={15} />;
    tone = "waiting";
    actionDescription = `Waiting for more signature shares (${scCount}/${sess.threshold}).`;
  } else {
    heading = "Waiting";
    icon = <Clock size={15} />;
    tone = "waiting";
    actionDescription = "Waiting for the ceremony to advance…";
  }

  const toneColor =
    tone === "action"
      ? "brand.solid"
      : tone === "waiting"
        ? "fg.muted"
        : "fg.subtle";

  return (
    <Box
      borderWidth={1}
      borderColor={tone === "action" ? "border.emphasis" : "border.default"}
      rounded="2xl"
      bg="bg.default"
      boxShadow="surface"
      px={5}
      py={5}
    >
      <Flex align="center" gap={2} mb={2}>
        <Box
          color={toneColor}
          display="flex"
          animation={
            tone === "waiting"
              ? "nexus-pulse 1.8s ease-in-out infinite"
              : undefined
          }
        >
          {icon}
        </Box>
        <Text
          fontFamily="heading"
          fontSize="sm"
          fontWeight="semibold"
          color="fg.default"
        >
          {heading}
        </Text>
      </Flex>

      <Text
        fontSize="xs"
        color="fg.muted"
        lineHeight="tall"
        mb={actionNode ? 4 : 0}
      >
        {actionDescription}
      </Text>

      {actionNode}

      {(localError || s.error) && (
        <Flex align="flex-start" gap={2} color="status.danger" mt={3}>
          <Box mt="1px" flexShrink={0}>
            <AlertCircle size={14} />
          </Box>
          <Text fontSize="xs" lineHeight="tall">
            {localError || s.error}
          </Text>
        </Flex>
      )}
    </Box>
  );
}
