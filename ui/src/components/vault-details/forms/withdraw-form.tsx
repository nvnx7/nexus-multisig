import { useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";

interface WithdrawFormProps {
  balance: number;
  onPropose: (recipient: string, amount: number) => void;
}

export function WithdrawForm({ balance, onPropose }: WithdrawFormProps) {
  const [recipient, setRecipient] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recipient) {
      setError("Recipient address is required.");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid withdrawal amount.");
      return;
    }

    if (amt > balance) {
      setError("Insufficient vault balance.");
      return;
    }

    onPropose(recipient, amt);
    setRecipient("");
    setAmount("");
  };

  return (
    <Flex direction="column" gap={4}>
      <Box>
        <Text as="h2" fontFamily="heading" fontSize="xl" fontWeight="semibold" color="fg.default">
          Initiate Multisig Withdrawal
        </Text>
        <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1}>
          Propose a withdrawal from this vault. This transaction requires co-signer approvals to execute.
        </Text>
      </Box>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex direction="column" gap={3}>
          <Flex direction="column" gap={1.5}>
            <Text fontFamily="body" fontSize="xs" fontWeight="medium" color="fg.default">
              Destination Stellar Address
            </Text>
            <Input
              placeholder="e.g. G..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
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
            Propose Withdrawal
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
