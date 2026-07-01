"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, Button, Flex, Input, Text } from "@chakra-ui/react";
import { useGroupShieldedWallet } from "@/hooks/useGroupShieldedWallet";
import { parseXLM } from "@/utils/token";

export function TransferForm() {
  const { vaultAddress } = useParams<{ vaultAddress: string }>();
  const { balance, proposeTx: propose } = useGroupShieldedWallet(vaultAddress);
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError(null);

    if (!destination) {
      setError("Shielded identity address is required.");
      return;
    }

    let amtStroops: bigint;
    try {
      amtStroops = parseXLM(amount);
      if (amtStroops <= 0n) throw new Error();
    } catch {
      setError("Please enter a valid transfer amount.");
      return;
    }

    if (balance !== null && amtStroops > balance) {
      setError("Insufficient vault balance.");
      return;
    }

    setPending(true);
    try {
      const id = await propose({
        type: "transfer",
        amount: amtStroops,
        recipientAddress: destination,
      });
      router.push(`/vault/${vaultAddress}/session/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to propose transfer",
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
          Shielded ZK Transfer
        </Text>
        <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={1}>
          Execute a private transfer to another shielded identity. Enforces ZK
          proof validation and requires co-signer approvals.
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
          <Button type="submit" mt={2} size="md" loading={pending}>
            Propose Shielded Transfer
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
