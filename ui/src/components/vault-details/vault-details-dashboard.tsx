import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Spinner, Text, Button } from "@chakra-ui/react";
import { AlertCircle } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { formatXLM } from "@/utils/token";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import type { TxDetails } from "@/lib/tx/txDetails";
import { VaultInfoPanel } from "./vault-info-panel";
import { VaultFormPanel } from "./vault-form-panel";
import { PendingTx } from "./types";

function txAmount(d: TxDetails): string {
  if (d.type === "deposit") return formatXLM(BigInt(d.ext_data.ext_amount));
  if (d.type === "withdraw") return formatXLM(-BigInt(d.ext_data.ext_amount));
  return formatXLM(BigInt(d.output_notes[0]!.amount));
}

interface VaultDetailsDashboardProps {
  vaultAddress: string;
}

export function VaultDetailsDashboard({ vaultAddress }: VaultDetailsDashboardProps) {
  const router = useRouter();
  const { stellarAddress } = useWallet();

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "transfer">("deposit");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const {
    group,
    isLoading: groupLoading,
    error: groupError,
    signSessions,
    shareableAddress,
    balance,
    balanceLoading,
  } = useGroupShieldedWallet(vaultAddress);

  if (groupLoading) {
    return (
      <Flex flex={1} align="center" justify="center" h="full" bg="bg.canvas">
        <Spinner size="xl" color="brand.solid" />
      </Flex>
    );
  }

  if (groupError || !group) {
    return (
      <Flex flex={1} direction="column" align="center" justify="center" gap={4} h="full" bg="bg.canvas" textAlign="center" px={6}>
        <Box color="status.danger">
          <AlertCircle size={48} />
        </Box>
        <Text fontFamily="heading" fontSize="lg" fontWeight="semibold" color="fg.default">
          Vault Not Found
        </Text>
        <Text fontFamily="body" fontSize="sm" color="fg.muted" maxW="xs">
          We couldn&apos;t find a registered threshold vault with the address {vaultAddress.slice(0, 8)}…
        </Text>
        <Button size="sm" onClick={() => router.push("/")} mt={2}>
          Back to Dashboard
        </Button>
      </Flex>
    );
  }

  const pendingTxs: PendingTx[] = signSessions.map((s) => ({
    id: s.id,
    type:
      s.tx_details.type === "transfer"
        ? "Transfer"
        : s.tx_details.type === "deposit"
          ? "Deposit"
          : "Withdraw",
    recipient: s.tx_details.ext_data.recipient,
    amount: txAmount(s.tx_details),
    signatures: s.nonce_commitment_count,
    threshold: s.threshold,
    signedByMe: s.proposer === stellarAddress,
    executed: s.status === "complete",
  }));

  return (
    <Flex flex={1} h="full" minH="0" overflow="hidden" w="full">
      <VaultInfoPanel
        vaultAddress={shareableAddress ?? vaultAddress}
        balance={balance}
        balanceLoading={balanceLoading}
        threshold={group.threshold}
        total={group.total}
        members={group.members}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCopyAddress={() => {
          navigator.clipboard.writeText(shareableAddress ?? vaultAddress);
        }}
        onBack={() => router.push("/")}
        userAddress={stellarAddress || undefined}
      />
      <VaultFormPanel
        activeTab={activeTab}
        pendingTxs={pendingTxs}
        notification={notification}
        onSelectSession={(sessionId) =>
          router.push(`/vault/${vaultAddress}/session/${sessionId}`)
        }
      />
    </Flex>
  );
}
