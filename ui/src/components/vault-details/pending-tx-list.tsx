import { Badge, Box, Button, Flex, Text } from "@chakra-ui/react";
import { Clock } from "lucide-react";
import { PendingTx } from "./types";

interface PendingTxListProps {
  pendingTxs: PendingTx[];
  onSimulateCoSign: (id: string) => void;
}

export function PendingTxList({ pendingTxs, onSimulateCoSign }: PendingTxListProps) {
  const activeTxs = pendingTxs.filter((t) => !t.executed);

  return (
    <Flex direction="column" gap={3} flex={1} minH={0}>
      <Text as="h3" fontFamily="heading" fontSize="sm" fontWeight="medium" color="fg.default">
        Pending Co-signatures ({activeTxs.length})
      </Text>

      {pendingTxs.length === 0 ? (
        <Flex
          flex={1}
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
            Propose a withdrawal or transfer to start the signing simulation.
          </Text>
        </Flex>
      ) : (
        <Flex direction="column" gap={3} overflowY="auto" maxH="24rem" pr={1}>
          {pendingTxs.map((tx) => (
            <Flex
              key={tx.id}
              direction="column"
              gap={3}
              p={4}
              rounded="md"
              borderWidth={1}
              borderColor={tx.executed ? "status.success" : "border.default"}
              bg={tx.executed ? "status.successBg" : "bg.subtle"}
            >
              <Flex align="center" justify="space-between" gap={2}>
                <Flex align="center" gap={2}>
                  <Badge colorPalette={tx.type === "Withdraw" ? "orange" : "blue"} size="sm">
                    {tx.type}
                  </Badge>
                  <Text fontFamily="heading" fontSize="xs" fontWeight="semibold" color="fg.default">
                    {tx.amount.toFixed(2)} XLM
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

              {/* Progress Indicator */}
              <Box h={1} w="full" rounded="full" bg="border.default" overflow="hidden">
                <Box
                  h="full"
                  bg={tx.executed ? "status.success" : "brand.solid"}
                  style={{ width: `${Math.min(100, (tx.signatures / tx.threshold) * 100)}%` }}
                />
              </Box>

              {/* Approve Simulation Button */}
              {!tx.executed && (
                <Button
                  size="xs"
                  alignSelf="flex-end"
                  onClick={() => onSimulateCoSign(tx.id)}
                >
                  Simulate Co-signer Approve
                </Button>
              )}
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
