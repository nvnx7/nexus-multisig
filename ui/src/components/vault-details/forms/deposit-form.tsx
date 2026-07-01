"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import { parseXLM } from "@/utils/token";

export function DepositForm() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();
  const { proposeTx } = useGroupShieldedWallet(vaultAddress);
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid deposit amount.");
      return;
    }
    setPending(true);
    try {
      const id = await proposeTx({ type: "deposit", amount: parseXLM(amount) });
      router.push(`/vault/${vaultAddress}/session/${id}`);
    } catch (err) {
      console.error("Failed to propose deposit:", err);
      setError(
        err instanceof Error ? err.message : "Failed to propose deposit",
      );
      setPending(false);
    }
  };

  return (
    <Flex direction="column" gap={4}>
      <Box>
        <Text
          as="h2"
          fontFamily="heading"
          fontSize="xl"
          fontWeight="semibold"
          color="fg.default"
        >
          Deposit XLM
        </Text>
        <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1}>
          Fund this vault by proposing a Deposit transaction.
        </Text>
      </Box>
      <Box as="form" onSubmit={handleSubmit}>
        <Flex direction="column" gap={3}>
          <Flex direction="column" gap={1.5}>
            <Text
              fontFamily="body"
              fontSize="xs"
              fontWeight="medium"
              color="fg.default"
            >
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
          {error && (
            <Text color="status.danger" fontSize="xs" mt={1}>
              {error}
            </Text>
          )}
          <Button type="submit" mt={2} size="md" loading={pending}>
            Propose Deposit
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
