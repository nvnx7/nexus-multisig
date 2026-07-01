import { Badge, Box, Flex, Text } from "@chakra-ui/react";
import { CheckCircle2, Clock } from "lucide-react";
import { PendingTx } from "./types";

interface TxCardProps {
  tx: PendingTx;
  onSelect: (id: string) => void;
}

function TxCard({ tx, onSelect }: TxCardProps) {
  return (
    <Flex
      direction="column"
      gap={3}
      p={4}
      rounded="md"
      borderWidth={1}
      borderColor={tx.executed ? "status.success" : "border.default"}
      bg={tx.executed ? "status.successBg" : "bg.subtle"}
      cursor="pointer"
      _hover={{ borderColor: "brand.solid", bg: tx.executed ? "status.successBg" : "bg.default" }}
      transition="border-color 0.15s, background 0.15s"
      onClick={() => onSelect(tx.id)}
    >
      <Flex align="center" justify="space-between" gap={2}>
        <Flex align="center" gap={2}>
          <Badge
            colorPalette={tx.type === "Withdraw" ? "orange" : tx.type === "Transfer" ? "purple" : "blue"}
            size="sm"
          >
            {tx.type}
          </Badge>
          <Text fontFamily="heading" fontSize="xs" fontWeight="semibold" color="fg.default">
            {tx.amount} XLM
          </Text>
        </Flex>
        <Badge colorPalette={tx.executed ? "green" : "teal"} size="sm" fontFamily="mono">
          {tx.executed ? "Executed" : `${tx.signatures} / ${tx.threshold} Signed`}
        </Badge>
      </Flex>

      <Flex direction="column" gap={1}>
        <Text fontFamily="mono" fontSize="2xs" color="fg.muted" truncate>
          To: {tx.recipient}
        </Text>
      </Flex>

      <Box h={1} w="full" rounded="full" bg="border.default" overflow="hidden">
        <Box
          h="full"
          bg={tx.executed ? "status.success" : "brand.solid"}
          style={{ width: `${Math.min(100, (tx.signatures / tx.threshold) * 100)}%` }}
        />
      </Box>
    </Flex>
  );
}

interface PendingTxListProps {
  pendingTxs: PendingTx[];
  onSelectSession: (id: string) => void;
}

export function PendingTxList({ pendingTxs, onSelectSession }: PendingTxListProps) {
  const active = pendingTxs.filter((t) => !t.executed);

  return (
    <Flex direction="column" gap={3}>
      <Text as="h3" fontFamily="heading" fontSize="sm" fontWeight="medium" color="fg.default">
        Transaction Proposals ({active.length})
      </Text>

      {active.length === 0 ? (
        <Flex
          align="center"
          justify="center"
          direction="column"
          borderStyle="dashed"
          borderWidth={1}
          borderColor="border.default"
          rounded="md"
          p={8}
          textAlign="center"
        >
          <Clock size={20} style={{ color: "var(--colors-fg-muted)", marginBottom: "0.5rem" }} />
          <Text fontFamily="body" fontSize="xs" color="fg.muted">
            No active signature proposals.
          </Text>
          <Text fontFamily="body" fontSize="2xs" color="fg.muted" mt={0.5}>
            Propose a withdrawal or transfer to start the signing ceremony.
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" gap={3}>
          {active.map((tx) => (
            <TxCard key={tx.id} tx={tx} onSelect={onSelectSession} />
          ))}
        </Flex>
      )}
    </Flex>
  );
}

interface CompletedTxListProps {
  pendingTxs: PendingTx[];
  onSelectSession: (id: string) => void;
}

export function CompletedTxList({ pendingTxs, onSelectSession }: CompletedTxListProps) {
  const completed = pendingTxs.filter((t) => t.executed);

  if (completed.length === 0) return null;

  return (
    <Flex direction="column" gap={3}>
      <Flex align="center" gap={2}>
        <CheckCircle2 size={14} style={{ color: "var(--colors-status-success)" }} />
        <Text as="h3" fontFamily="heading" fontSize="sm" fontWeight="medium" color="fg.default">
          Completed ({completed.length})
        </Text>
      </Flex>

      <Flex direction="column" gap={3}>
        {completed.map((tx) => (
          <TxCard key={tx.id} tx={tx} onSelect={onSelectSession} />
        ))}
      </Flex>
    </Flex>
  );
}
