import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Flex, Spinner, Text, Button } from "@chakra-ui/react";
import { AlertCircle } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import type { TxProposal } from "@/api/sign-sessions/createSignSession";
import { VaultInfoPanel } from "./vault-info-panel";
import { VaultFormPanel } from "./vault-form-panel";
import { PendingTx } from "./types";

interface VaultDetailsDashboardProps {
  vaultAddress: string;
}

export function VaultDetailsDashboard({ vaultAddress }: VaultDetailsDashboardProps) {
  const router = useRouter();
  const { stellarAddress } = useWallet();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "transfer">("deposit");

  // Simulated balance (real balance needs note scanning — out of scope here)
  const [balance] = useState<number>(1250.0);

  // Notification states
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);

  // Auto-dismiss notification after 5s
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
    commit,
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

  const threshold = group.threshold;
  const total = group.total;
  const members = group.members;

  // Proposed transactions for this vault, shared via the coordinator.
  const pendingTxs: PendingTx[] = signSessions.map((s) => ({
    id: s.id,
    type:
      s.tx.type === "transfer"
        ? "Transfer"
        : s.tx.type === "deposit"
          ? "Deposit"
          : "Withdraw",
    recipient: s.tx.recipient ?? "",
    amount: Number(s.tx.amount),
    signatures: s.nonce_commitment_count,
    threshold: s.threshold,
    signedByMe: s.proposer === stellarAddress,
    executed: s.status === "complete",
  }));

  // Propose a transaction (frostCommit + create sign session via the hook).
  const propose = async (tx: TxProposal, okMessage: string) => {
    try {
      await commit(tx);
      setNotification({ message: okMessage, type: "info" });
    } catch (e) {
      setNotification({
        message: e instanceof Error ? e.message : "Failed to propose transaction",
        type: "error",
      });
    }
  };

  const handleDeposit = (amount: number) =>
    propose(
      { type: "deposit", amount: String(amount) },
      `Deposit of ${amount} proposed. Requires ${threshold} signatures.`,
    );

  const handleProposeWithdraw = (recipient: string, amount: number) =>
    propose(
      { type: "withdraw", amount: String(amount), recipient },
      `Withdrawal proposed. Requires ${threshold} signatures.`,
    );

  const handleProposeTransfer = (destination: string, amount: number) =>
    propose(
      { type: "transfer", amount: String(amount), recipient: destination },
      `Transfer proposed. Requires ${threshold} signatures.`,
    );

  const handleSimulateCoSign = () =>
    setNotification({
      message: "Co-signing arrives in the next update.",
      type: "info",
    });

  return (
    <Flex flex={1} h="full" minH="0" overflow="hidden" w="full">
      <VaultInfoPanel
        vaultAddress={shareableAddress ?? vaultAddress}
        balance={balance}
        threshold={threshold}
        total={total}
        members={members}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCopyAddress={() => {
          navigator.clipboard.writeText(shareableAddress ?? vaultAddress);
          setNotification({ message: "Shielded address copied!", type: "success" });
        }}
        onBack={() => router.push("/")}
        userAddress={stellarAddress || undefined}
      />
      <VaultFormPanel
        activeTab={activeTab}
        balance={balance}
        pendingTxs={pendingTxs}
        notification={notification}
        onDeposit={handleDeposit}
        onProposeWithdraw={handleProposeWithdraw}
        onProposeTransfer={handleProposeTransfer}
        onSimulateCoSign={handleSimulateCoSign}
      />
    </Flex>
  );
}
