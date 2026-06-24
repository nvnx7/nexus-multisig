"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Field,
  Flex,
  Input,
  Separator,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { Minus, Plus, X } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useCreateDkgSession } from "@/api/dkg/createDkgSession";
import { getShieldedAddress } from "@/api/pool/getShieldedAddress";

interface MemberEntry {
  stellarAddress: string;
  isSelf: boolean;
}

// ── Number stepper (replacement for HeroUI NumberField) ──────────────────────

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}

function NumberStepper({ value, onChange, min, max }: NumberStepperProps) {
  return (
    <Flex
      align="center"
      borderWidth={1}
      borderColor="border.emphasis"
      rounded="md"
      overflow="hidden"
      display="inline-flex"
      h={9}
    >
      <Button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        px={3}
        h="full"
        minW={0}
        rounded="none"
        aria-label="Decrease"
      >
        <Minus size={12} />
      </Button>
      <Flex
        align="center"
        justify="center"
        w={10}
        h="full"
        borderLeftWidth={1}
        borderRightWidth={1}
        borderColor="border.emphasis"
        fontFamily="mono"
        fontSize="sm"
        fontWeight="medium"
        color="fg.default"
        bg="bg.default"
      >
        {value}
      </Flex>
      <Button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        px={3}
        h="full"
        minW={0}
        rounded="none"
        aria-label="Increase"
      >
        <Plus size={12} />
      </Button>
    </Flex>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ConfigureStep() {
  const router = useRouter();
  const { stellarAddress } = useWallet();

  const [members, setMembers] = useState<MemberEntry[]>(() =>
    stellarAddress ? [{ stellarAddress, isSelf: true }] : [],
  );
  const [inputValue, setInputValue] = useState("");
  const [inputChecking, setInputChecking] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(2);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    mutate: createDkgSession,
    isPending: isStarting,
    error: startError,
  } = useCreateDkgSession();

  const addMember = async () => {
    const addr = inputValue.trim();
    if (!addr) return;

    if (members.some((m) => m.stellarAddress === addr)) {
      setInputError("Already added");
      return;
    }

    setInputChecking(true);
    setInputError(null);

    try {
      const shieldedAddress = await getShieldedAddress(addr);
      if (!shieldedAddress) {
        setInputError("No registered shielded wallet found for this address");
        return;
      }
      setMembers((prev) => [...prev, { stellarAddress: addr, isSelf: false }]);
      setInputValue("");
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch {
      setInputError("Failed to look up address");
    } finally {
      setInputChecking(false);
    }
  };

  const removeMember = (addr: string) => {
    setMembers((prev) =>
      prev.filter((m) => m.stellarAddress !== addr || m.isSelf),
    );
    if (threshold > members.length - 1) {
      setThreshold(Math.max(1, members.length - 1));
    }
  };

  const handleSubmit = () => {
    if (!stellarAddress) return;
    createDkgSession(
      { threshold, participants: members.map((m) => m.stellarAddress) },
      { onSuccess: ({ id }) => router.push(`/vault/new/${id}`) },
    );
  };

  const canStart =
    members.length >= 2 &&
    !isStarting &&
    threshold >= 1 &&
    threshold <= members.length;

  return (
    <Flex direction="column" gap={8}>
      {/* Participants */}
      <Flex direction="column" gap={4}>
        <Box>
          <Text
            as="h3"
            fontFamily="heading"
            fontSize="md"
            fontWeight="semibold"
            color="fg.default"
          >
            Participants
          </Text>
          <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={0.5}>
            Add co-signers by their Stellar address. At least 2 required.
          </Text>
        </Box>

        {/* Address input row */}
        <Field.Root invalid={!!inputError}>
          <Flex gap={2} w="full">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") addMember();
              }}
              placeholder="Stellar address (G…)"
              fontFamily="mono"
              fontSize="xs"
              flex={1}
              size="sm"
            />
            <Button
              size="sm"
              onClick={addMember}
              disabled={inputChecking || !inputValue.trim()}
              flexShrink={0}
              h={9}
            >
              {inputChecking ? <Spinner as="span" size="sm" color="brand.solid" /> : "Add"}
            </Button>
          </Flex>
          {inputError && (
            <Field.ErrorText fontFamily="body" fontSize="xs">
              {inputError}
            </Field.ErrorText>
          )}
        </Field.Root>

        {/* Member list */}
        <Flex direction="column" gap={1.5}>
          {members.map((m) => (
            <Flex
              key={m.stellarAddress}
              align="center"
              gap={3}
              py={2.5}
              px={3}
              rounded="md"
            // bg="bg.subtle"
            >
              <Text
                fontFamily="mono"
                fontSize="xs"
                color="fg.default"
                truncate
                flex={1}
                minW={0}
              >
                {m.stellarAddress}
              </Text>
              <Flex align="center" gap={2} flexShrink={0}>
                {m.isSelf && (
                  <Badge
                    variant="subtle"
                    colorPalette="green"
                    fontFamily="mono"
                    fontSize="2xs"
                  >
                    You
                  </Badge>
                )}
                {!m.isSelf && (
                  <Button
                    size="xs"
                    onClick={() => removeMember(m.stellarAddress)}
                    _hover={{ color: "status.danger", bg: "status.dangerBg" }}
                    aria-label="Remove member"
                    minW={0}
                  >
                    <X size={14} />
                  </Button>
                )}
              </Flex>
            </Flex>
          ))}
        </Flex>
      </Flex>

      <Separator borderColor="border.subtle" />

      {/* Threshold */}
      <Flex direction="column" gap={4}>
        <Box>
          <Text
            as="h3"
            fontFamily="heading"
            fontSize="md"
            fontWeight="semibold"
            color="fg.default"
          >
            Signing threshold
          </Text>
          <Text fontFamily="body" fontSize="xs" color="fg.muted" mt={0.5}>
            Minimum signatures required to authorize a transaction.
          </Text>
        </Box>

        <Flex align="center" gap={3}>
          <Text fontFamily="body" fontSize="sm" color="fg.muted" flexShrink={0}>
            Require
          </Text>
          <NumberStepper
            value={threshold}
            onChange={setThreshold}
            min={1}
            max={members.length || 1}
          />
          <Text fontFamily="body" fontSize="sm" color="fg.muted">
            of {members.length} signer{members.length !== 1 ? "s" : ""}
          </Text>
        </Flex>
      </Flex>

      {startError && (
        <Text fontFamily="body" fontSize="xs" color="status.danger">
          {startError.message ?? "Failed to create session"}
        </Text>
      )}

      <Button
        disabled={!canStart}
        onClick={handleSubmit}
        mt={2}
      >
        {isStarting ? <Spinner as="span" size="sm" color="white" /> : null}
        {isStarting ? "Creating…" : "Create Vault"}
      </Button>
    </Flex>
  );
}
