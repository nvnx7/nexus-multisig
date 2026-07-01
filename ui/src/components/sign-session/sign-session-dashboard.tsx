"use client";

import { useRouter } from "next/navigation";
import { Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { ArrowLeft } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import { VaultSummaryPanel } from "@/components/vault-details/vault-summary-panel";
import { VaultActionButtons } from "@/components/vault-details/vault-action-buttons";
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
  const { stellarAddress } = useWallet();
  const { group, balance, balanceLoading, shareableAddress } =
    useGroupShieldedWallet(vaultAddress);

  const displayAddress = shareableAddress ?? vaultAddress;

  return (
    <Flex flex={1} h="full" minH="0" overflow="hidden" w="full">
      {/* ── Left: vault summary ── */}
      {group ? (
        <VaultSummaryPanel
          vaultAddress={displayAddress}
          balance={balance}
          balanceLoading={balanceLoading}
          threshold={group.threshold}
          total={group.total}
          members={group.members}
          userAddress={stellarAddress || undefined}
          onCopyAddress={() => navigator.clipboard.writeText(displayAddress)}
        >
          <VaultActionButtons
            onSelect={(tab) => router.push(`/vault/${vaultAddress}?tab=${tab}`)}
          />
        </VaultSummaryPanel>
      ) : (
        <Flex
          w="50%"
          h="full"
          bg="brand.emphasis"
          align="center"
          justify="center"
          flexShrink={0}
        >
          <Spinner size="md" color="brand.text" />
        </Flex>
      )}

      {/* ── Right: signing ceremony ── */}
      <Flex
        direction="column"
        w="50%"
        h="full"
        bg="bg.canvas"
        flexShrink={0}
        overflowY="auto"
        px={12}
        py={10}
      >
        {/* Header */}
        <Flex align="center" justify="space-between" mb={6} gap={4}>
          <Flex align="center" gap={3} minW={0}>
            <Button
              size="sm"
              variant="ghost"
              px={2}
              onClick={() => router.push(`/vault/${vaultAddress}`)}
              color="fg.muted"
              _hover={{ color: "fg.default", bg: "bg.subtle" }}
              aria-label="Back to vault"
              flexShrink={0}
            >
              <ArrowLeft size={18} />
            </Button>
            <Flex direction="column" gap={0.5} minW={0}>
              <Text
                fontFamily="heading"
                fontSize="lg"
                fontWeight="semibold"
                letterSpacing="-0.01em"
                color="fg.default"
              >
                Signing Session
              </Text>
              <Text fontFamily="body" fontSize="xs" color="fg.muted">
                Review and approve this transaction
              </Text>
            </Flex>
          </Flex>

          <Flex direction="column" align="flex-end" gap={0.5} flexShrink={0}>
            <Text
              fontFamily="mono"
              fontSize="9px"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="fg.subtle"
            >
              Session
            </Text>
            <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
              {sessionId.slice(0, 8)}…{sessionId.slice(-6)}
            </Text>
          </Flex>
        </Flex>

        <TransactionSummaryCard vaultAddress={vaultAddress} sessionId={sessionId} />
        <CeremonyProgressCard vaultAddress={vaultAddress} sessionId={sessionId} />
        <CeremonyActionCard vaultAddress={vaultAddress} sessionId={sessionId} />
      </Flex>
    </Flex>
  );
}
