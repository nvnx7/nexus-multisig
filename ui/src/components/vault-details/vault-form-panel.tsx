import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Box, Flex, Separator, Text } from "@chakra-ui/react";
import { DepositForm } from "./forms/deposit-form";
import { WithdrawForm } from "./forms/withdraw-form";
import { TransferForm } from "./forms/transfer-form";
import { PendingTxList } from "./pending-tx-list";
import { PendingTx } from "./types";

interface VaultFormPanelProps {
  activeTab: "deposit" | "withdraw" | "transfer";
  pendingTxs: PendingTx[];
  notification: { message: string; type: "success" | "info" | "error" } | null;
  onSelectSession: (id: string) => void;
}

export function VaultFormPanel({
  activeTab,
  pendingTxs,
  notification,
  onSelectSession,
}: VaultFormPanelProps) {
  return (
    <Box
      as="section"
      display="flex"
      flexDirection="column"
      w="50%"
      h="full"
      bg="bg.default"
      px={12}
      py={10}
      gap={6}
      overflowY="auto"
    >
      {notification && (
        <Flex
          align="center"
          gap={3}
          py={3}
          px={4}
          rounded="md"
          bg={
            notification.type === "success"
              ? "status.successBg"
              : notification.type === "error"
                ? "status.dangerBg"
                : "bg.subtle"
          }
          borderWidth={1}
          borderColor={
            notification.type === "success"
              ? "status.success"
              : notification.type === "error"
                ? "status.danger"
                : "border.default"
          }
          flexShrink={0}
        >
          {notification.type === "success" ? (
            <Box color="status.success"><CheckCircle2 size={16} /></Box>
          ) : (
            <Box color="status.danger"><AlertCircle size={16} /></Box>
          )}
          <Text fontFamily="body" fontSize="xs" color="fg.default" fontWeight="medium">
            {notification.message}
          </Text>
        </Flex>
      )}

      {activeTab === "deposit" && <DepositForm />}
      {activeTab === "withdraw" && <WithdrawForm />}
      {activeTab === "transfer" && <TransferForm />}

      <Separator borderColor="border.subtle" my={2} />

      <PendingTxList pendingTxs={pendingTxs} onSelectSession={onSelectSession} />
    </Box>
  );
}
