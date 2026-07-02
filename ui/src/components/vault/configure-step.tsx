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
  Spinner,
  Text,
} from "@chakra-ui/react";
import { Minus, Plus, Shield, UserPlus, X } from "lucide-react";
import { useWallet } from "@/context/wallet-context";
import { useCreateDkgSession } from "@/api/dkg/createDkgSession";
import { getShieldedAddress } from "@/api/pool/getShieldedAddress";

interface MemberEntry {
  stellarAddress: string;
  isSelf: boolean;
}

// ── Number stepper ────────────────────────────────────────────────────────────

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
      borderColor="border.default"
      rounded="lg"
      overflow="hidden"
      display="inline-flex"
      h={9}
      bg="bg.subtle"
    >
      <Button
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        px={3}
        h="full"
        minW={0}
        rounded="none"
        variant="ghost"
        color="fg.muted"
        _hover={{ bg: "bg.muted", color: "fg.default" }}
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
        borderColor="border.default"
        fontFamily="mono"
        fontSize="sm"
        fontWeight="semibold"
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
        variant="ghost"
        color="fg.muted"
        _hover={{ bg: "bg.muted", color: "fg.default" }}
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
    <Flex direction="column" gap={7}>
      {/* Step title */}
      <Box>
        <Text fontFamily="heading" fontSize="lg" fontWeight="semibold" color="fg.default" mb={1}>
          Vault Members
        </Text>
        <Text fontFamily="body" fontSize="sm" color="fg.muted" lineHeight="relaxed">
          Add co-signers by their Stellar address. You need at least 2 members.
        </Text>
      </Box>

      {/* Address input */}
      <Flex direction="column" gap={3}>
        <Text
          fontFamily="body"
          fontSize="2xs"
          textTransform="uppercase"
          letterSpacing="widest"
          color="fg.muted"
          fontWeight="semibold"
        >
          Add member
        </Text>
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
              borderColor="border.default"
              _focus={{ borderColor: "brand.solid", boxShadow: "0 0 0 1px var(--chakra-colors-brand-solid)" }}
            />
            <Button
              size="sm"
              onClick={addMember}
              disabled={inputChecking || !inputValue.trim()}
              flexShrink={0}
              h={9}
              gap={1.5}
            >
              {inputChecking ? (
                <Spinner as="span" size="sm" />
              ) : (
                <UserPlus size={13} />
              )}
              Add
            </Button>
          </Flex>
          {inputError && (
            <Field.ErrorText fontFamily="body" fontSize="xs">
              {inputError}
            </Field.ErrorText>
          )}
        </Field.Root>
      </Flex>

      {/* Member list */}
      {members.length > 0 && (
        <Flex direction="column" gap={2}>
          <Text
            fontFamily="body"
            fontSize="2xs"
            textTransform="uppercase"
            letterSpacing="widest"
            color="fg.muted"
            fontWeight="semibold"
          >
            Members · {members.length}
          </Text>
          <Flex direction="column" gap={1.5}>
            {members.map((m) => (
              <Flex
                key={m.stellarAddress}
                align="center"
                gap={3}
                py={2.5}
                px={3}
                rounded="lg"
                bg="bg.subtle"
                borderWidth={1}
                borderColor="border.default"
              >
                <Box
                  w={2}
                  h={2}
                  rounded="full"
                  bg={m.isSelf ? "brand.solid" : "fg.subtle"}
                  flexShrink={0}
                />
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
                      variant="ghost"
                      onClick={() => removeMember(m.stellarAddress)}
                      _hover={{ color: "status.danger", bg: "status.dangerBg" }}
                      color="fg.muted"
                      aria-label="Remove member"
                      minW={0}
                    >
                      <X size={13} />
                    </Button>
                  )}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Flex>
      )}

      {/* Divider */}
      <Box w="full" h="1px" bg="border.subtle" />

      {/* Approval policy */}
      <Flex direction="column" gap={4}>
        <Box>
          <Text
            fontFamily="body"
            fontSize="2xs"
            textTransform="uppercase"
            letterSpacing="widest"
            color="fg.muted"
            fontWeight="semibold"
            mb={3}
          >
            Approval Policy
          </Text>
          <Text fontFamily="heading" fontSize="sm" fontWeight="semibold" color="fg.default" mb={0.5}>
            Signatures required to approve a transaction
          </Text>
          <Text fontFamily="body" fontSize="xs" color="fg.muted">
            How many members must sign before a transaction can be sent.
          </Text>
        </Box>

        <Flex align="center" gap={4} py={3} px={4} rounded="lg" bg="bg.subtle" borderWidth={1} borderColor="border.default">
          <NumberStepper
            value={threshold}
            onChange={setThreshold}
            min={1}
            max={members.length || 1}
          />
          <Flex direction="column" gap={0}>
            <Text fontFamily="body" fontSize="sm" color="fg.default" fontWeight="medium">
              of {members.length} member{members.length !== 1 ? "s" : ""}
            </Text>
            <Text fontFamily="body" fontSize="xs" color="fg.muted">
              {threshold === members.length ? "All members must sign" : `Any ${threshold} members must sign`}
            </Text>
          </Flex>
        </Flex>
      </Flex>

      {startError && (
        <Flex align="center" gap={2} py={2.5} px={3} rounded="lg" bg="status.dangerBg" borderWidth={1} borderColor="status.danger">
          <Text fontFamily="body" fontSize="xs" color="status.danger">
            {startError.message ?? "Failed to create vault setup"}
          </Text>
        </Flex>
      )}

      <Button
        disabled={!canStart}
        onClick={handleSubmit}
        w="full"
        h={10}
        gap={2}
      >
        {isStarting ? (
          <>
            <Spinner as="span" size="sm" />
            Setting up…
          </>
        ) : (
          <>
            <Shield size={15} />
            Create Vault
          </>
        )}
      </Button>
    </Flex>
  );
}
