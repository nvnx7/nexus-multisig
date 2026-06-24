import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Box, Flex, Spinner, Text, Button } from "@chakra-ui/react";
import { AlertCircle } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { getGroups } from "@/api/groups/getGroups";
import { getGroup } from "@/api/groups/getGroup";
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

  // Dynamic simulation states
  const [balance, setBalance] = useState<number>(1250.0);
  const [pendingTxs, setPendingTxs] = useState<PendingTx[]>([]);

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

  // Fetch group ID by agg_address
  const { data: groupsList, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ["groups", vaultAddress],
    queryFn: () => getGroups({ agg_address: vaultAddress }),
    enabled: !!vaultAddress,
  });

  const groupId = groupsList?.[0]?.id;

  // Fetch full details of the group
  const { data: group, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ["group-details", groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId,
  });

  if (listLoading || (groupId && groupLoading)) {
    return (
      <Flex flex={1} align="center" justify="center" h="full" bg="bg.canvas">
        <Spinner size="xl" color="brand.solid" />
      </Flex>
    );
  }

  if (listError || groupError || !groupsList || groupsList.length === 0) {
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

  const threshold = group?.threshold ?? groupsList[0]?.threshold ?? 2;
  const total = group?.total ?? groupsList[0]?.total ?? 3;
  const members = group?.members ?? [];

  // Handlers for simulator actions
  const handleDeposit = (amount: number) => {
    setBalance((prev) => prev + amount);
    setNotification({
      message: `Simulated deposit of ${amount.toFixed(2)} XLM completed successfully!`,
      type: "success",
    });
  };

  const handleProposeWithdraw = (recipient: string, amount: number) => {
    const newTx: PendingTx = {
      id: Math.random().toString(36).substring(7),
      type: "Withdraw",
      recipient,
      amount,
      signatures: 1, // Signed by me
      threshold,
      signedByMe: true,
      executed: false,
    };

    setPendingTxs((prev) => [newTx, ...prev]);
    setNotification({
      message: `Multisig withdrawal created. Requires ${threshold} signatures to execute.`,
      type: "info",
    });
  };

  const handleProposeTransfer = (destination: string, amount: number) => {
    const newTx: PendingTx = {
      id: Math.random().toString(36).substring(7),
      type: "Transfer",
      recipient: destination,
      amount,
      signatures: 1, // Signed by me
      threshold,
      signedByMe: true,
      executed: false,
    };

    setPendingTxs((prev) => [newTx, ...prev]);
    setNotification({
      message: `Shielded transfer transaction created. Requires ${threshold} signatures to execute.`,
      type: "info",
    });
  };

  const handleSimulateCoSign = (txId: string) => {
    setPendingTxs((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx;

        const nextSigs = tx.signatures + 1;
        const isExecuted = nextSigs >= tx.threshold;

        if (isExecuted && !tx.executed) {
          // Subtract from simulated balance on execution
          setBalance((b) => Math.max(0, b - tx.amount));
          setNotification({
            message: `Transaction approved & executed successfully! ${tx.amount.toFixed(2)} XLM sent.`,
            type: "success",
          });
        } else {
          setNotification({
            message: `Co-signer signature simulated. Progress: ${nextSigs} / ${tx.threshold}`,
            type: "success",
          });
        }

        return {
          ...tx,
          signatures: nextSigs,
          executed: isExecuted,
        };
      })
    );
  };

  return (
    <Flex flex={1} h="full" minH="0" overflow="hidden" w="full">
      <VaultInfoPanel
        vaultAddress={vaultAddress}
        balance={balance}
        threshold={threshold}
        total={total}
        members={members}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCopyAddress={() => {
          navigator.clipboard.writeText(vaultAddress);
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
