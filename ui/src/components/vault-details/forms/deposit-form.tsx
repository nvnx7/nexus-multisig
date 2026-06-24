import { useState } from "react";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";

interface DepositFormProps {
  onDeposit: (amount: number) => void;
}

export function DepositForm({ onDeposit }: DepositFormProps) {
  const [amount, setAmount] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!isNaN(amt) && amt > 0) {
      onDeposit(amt);
      setAmount("");
    }
  };

  return (
    <Flex direction="column" gap={4}>
      <Box>
        <Text as="h2" fontFamily="heading" fontSize="xl" fontWeight="semibold" color="fg.default">
          Deposit XLM into Vault
        </Text>
        <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1}>
          Fund this threshold vault. Anyone can deposit without signing authorizations.
        </Text>
      </Box>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex direction="column" gap={3}>
          <Flex direction="column" gap={1.5}>
            <Text fontFamily="body" fontSize="xs" fontWeight="medium" color="fg.default">
              Amount (XLM)
            </Text>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              bg="bg.subtle"
              borderColor="border.subtle"
              size="md"
              required
            />
          </Flex>
          <Button type="submit" mt={2} size="md">
            Deposit XLM
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
