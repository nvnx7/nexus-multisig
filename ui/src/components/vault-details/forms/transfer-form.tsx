import { useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";

interface TransferFormProps {
  balance: number;
  onPropose: (destination: string, amount: number) => void;
}

export function TransferForm({ balance, onPropose }: TransferFormProps) {
  const [destination, setDestination] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destination) {
      setError("Shielded identity address is required.");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid transfer amount.");
      return;
    }

    if (amt > balance) {
      setError("Insufficient vault balance.");
      return;
    }

    onPropose(destination, amt);
    setDestination("");
    setAmount("");
  };

  return (
    <Flex direction="column" gap={4}>
      <Box>
        <Text as="h2" fontFamily="heading" fontSize="xl" fontWeight="semibold" color="fg.default">
          Shielded ZK Transfer
        </Text>
        <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1}>
          Execute a private transfer to another shielded identity. Enforces ZK proof validation and requires co-signer approvals.
        </Text>
      </Box>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex direction="column" gap={3}>
          <Flex direction="column" gap={1.5}>
            <Text fontFamily="body" fontSize="xs" fontWeight="medium" color="fg.default">
              Destination Shielded Identity (Nexus Address)
            </Text>
            <Input
              placeholder="e.g. nexus..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              bg="bg.subtle"
              borderColor="border.subtle"
              size="md"
              required
            />
          </Flex>
          <Flex direction="column" gap={1.5}>
            <Text fontFamily="body" fontSize="xs" fontWeight="medium" color="fg.default">
              Amount (XLM)
            </Text>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 50"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              bg="bg.subtle"
              borderColor="border.subtle"
              size="md"
              required
            />
          </Flex>

          {error && (
            <Text color="status.danger" fontSize="xs" mt={1}>
              {error}
            </Text>
          )}

          <Button type="submit" mt={2} size="md">
            Propose Shielded Transfer
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
