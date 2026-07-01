"use client";

import { useRouter } from "next/navigation";
import { Box, Button, Flex } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { TransactionSummaryCard } from "./transaction-summary-card";
import { CeremonyProgressCard } from "./ceremony-progress-card";
import { CeremonyActionCard } from "./ceremony-action-card";

export function SignSessionDashboard({
  vaultAddress,
  sessionId,
}: {
  vaultAddress: string;
  sessionId: string;
}) {
  const router = useRouter();

  return (
    <Flex flex={1} direction="column" align="center" h="full" bg="bg.canvas" overflowY="auto" py={10} px={6}>
      <Box w="full" maxW="lg">
        <Button
          size="xs"
          variant="ghost"
          onClick={() => router.push(`/vault/${vaultAddress}`)}
          mb={6}
          color="fg.muted"
        >
          <ArrowLeft size={14} />
          Back to vault
        </Button>

        <TransactionSummaryCard vaultAddress={vaultAddress} sessionId={sessionId} />
        <CeremonyProgressCard vaultAddress={vaultAddress} sessionId={sessionId} />
        <CeremonyActionCard vaultAddress={vaultAddress} sessionId={sessionId} />
      </Box>
    </Flex>
  );
}
