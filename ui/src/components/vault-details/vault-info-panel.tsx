"use client";

import { useState } from "react";
import { Box, Button, Flex, Separator, Spinner, Text } from "@chakra-ui/react";
import { Copy, Check, Send, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatXLM } from "@/utils/token";
import { useGetXLMPrice } from "@/api/price";

interface Member {
  address: string;
}

interface VaultInfoPanelProps {
  vaultAddress: string;
  balance: bigint | null;
  balanceLoading: boolean;
  threshold: number;
  total: number;
  members: Member[];
  activeTab: "deposit" | "withdraw" | "transfer";
  onTabChange: (tab: "deposit" | "withdraw" | "transfer") => void;
  onCopyAddress: () => void;
  onBack: () => void;
  userAddress?: string;
}

function midTruncate(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}…${addr.slice(-6)}`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="9px"
      letterSpacing="0.14em"
      textTransform="uppercase"
      color="brand.text"
      opacity={0.7}
    >
      {children}
    </Text>
  );
}

export function VaultInfoPanel({
  vaultAddress,
  balance,
  balanceLoading,
  threshold,
  total,
  members,
  activeTab,
  onTabChange,
  onCopyAddress,
  userAddress,
}: VaultInfoPanelProps) {
  const [copied, setCopied] = useState(false);
  const { data: xlmPrice } = useGetXLMPrice();

  function handleCopy() {
    onCopyAddress();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Box
      as="section"
      display="flex"
      flexDirection="column"
      w="50%"
      h="full"
      bg="brand.emphasis"
      px={10}
      pt={9}
      pb={8}
      gap={5}
      flexShrink={0}
    >
      {/* ── Title ────────────────────────────────────── */}
      <Flex direction="column" gap={0.5} flexShrink={0}>
        <Flex align="center" gap={3}>
          <Text
            as="h1"
            fontFamily="heading"
            fontSize="2xl"
            fontWeight="semibold"
            letterSpacing="-0.01em"
            color="white"
          >
            Nexus Vault
          </Text>

          <Box
            px={3}
            py={1}
            bg="rgba(255,255,255,0.06)"
            border="1px solid"
            borderColor="rgba(255,255,255,0.12)"
            borderRadius="full"
            flexShrink={0}
          >
            <Text
              fontFamily="mono"
              fontSize="2xs"
              color="brand.text"
              letterSpacing="0.02em"
            >
              {midTruncate(vaultAddress)}
            </Text>
          </Box>
        </Flex>

        <Text fontFamily="body" fontSize="xs" color="brand.text" opacity={0.75}>
          Stellar Private Multisig
        </Text>
      </Flex>

      {/* ── Shielded Address ─────────────────────────── */}
      <Flex
        direction="column"
        gap={2}
        bg="rgba(255,255,255,0.03)"
        border="1px solid"
        borderColor="rgba(255,255,255,0.07)"
        rounded="lg"
        px={4}
        py={3.5}
        flexShrink={0}
      >
        <SectionLabel>Shielded Address</SectionLabel>
        <Flex align="flex-start" gap={3}>
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="rgba(255,255,255,0.75)"
            flex={1}
            wordBreak="break-all"
            lineHeight="1.65"
          >
            {vaultAddress}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            color={copied ? "white" : "brand.text"}
            _hover={{ bg: "rgba(255,255,255,0.08)", color: "white" }}
            flexShrink={0}
            mt={0.5}
            onClick={handleCopy}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </Flex>
      </Flex>

      {/* ── Balance ──────────────────────────────────── */}
      <Flex
        direction="column"
        gap={2}
        bg="rgba(255,255,255,0.05)"
        border="1px solid"
        borderColor="rgba(255,255,255,0.09)"
        rounded="lg"
        px={4}
        py={4}
        flexShrink={0}
      >
        <SectionLabel>Vault Balance</SectionLabel>
        {balanceLoading ? (
          <Flex align="center" gap={2} mt={1}>
            <Spinner size="xs" color="brand.text" />
            <Text fontFamily="body" fontSize="xs" color="brand.text">
              Scanning notes…
            </Text>
          </Flex>
        ) : (
          <>
            <Flex align="baseline" gap={2} mt={0.5}>
              <Text
                fontFamily="heading"
                fontSize="4xl"
                fontWeight="bold"
                color="white"
                letterSpacing="-0.02em"
                lineHeight={1}
              >
                {formatXLM(balance ?? 0n)}
              </Text>
              <Text
                fontFamily="mono"
                fontSize="sm"
                color="brand.text"
                fontWeight="medium"
              >
                XLM
              </Text>
            </Flex>
            {xlmPrice != null && balance !== null && (
              <Text
                fontFamily="mono"
                fontSize="xs"
                color="brand.text"
                opacity={0.7}
                mt={1}
              >
                {"≈ $"}
                {(parseFloat(formatXLM(balance)) * xlmPrice).toFixed(2)} USD
              </Text>
            )}
          </>
        )}
      </Flex>

      {/* ── Signing Policy ───────────────────────────── */}
      <Flex
        direction="column"
        gap={3}
        bg="rgba(255,255,255,0.03)"
        border="1px solid"
        borderColor="rgba(255,255,255,0.07)"
        rounded="lg"
        px={4}
        py={4}
        flexShrink={0}
      >
        <SectionLabel>Signing Policy</SectionLabel>

        <Flex align="baseline" gap={2.5}>
          <Text
            fontFamily="heading"
            fontSize="4xl"
            fontWeight="bold"
            color="white"
            letterSpacing="-0.02em"
            lineHeight={1}
          >
            {threshold}
            <Text as="span" color="brand.text" mx={1}>
              /
            </Text>
            {total}
          </Text>
          <Text fontFamily="body" fontSize="xs" color="brand.text">
            Signatures Required
          </Text>
        </Flex>

        <Separator borderColor="rgba(255,255,255,0.07)" />

        <Flex direction="column" gap={0.5}>
          <SectionLabel>Co-signers</SectionLabel>
          <Flex direction="column" gap={2.5} mt={1.5}>
            {members.length > 0 ? (
              members.map((m, idx) => (
                <Flex key={m.address} align="flex-start" gap={2}>
                  <Text
                    fontFamily="mono"
                    fontSize="2xs"
                    color="brand.text"
                    opacity={0.6}
                    mt="1px"
                    minW="14px"
                  >
                    {idx + 1}.
                  </Text>
                  <Text
                    fontFamily="mono"
                    fontSize="xs"
                    color={
                      m.address === userAddress
                        ? "white"
                        : "rgba(255,255,255,0.65)"
                    }
                    wordBreak="break-all"
                    lineHeight="1.6"
                  >
                    {m.address}
                    {m.address === userAddress && (
                      <Text as="span" color="brand.text" fontWeight="medium">
                        {" "}
                        (You)
                      </Text>
                    )}
                  </Text>
                </Flex>
              ))
            ) : (
              <Text
                fontFamily="body"
                fontSize="2xs"
                color="brand.text"
                opacity={0.6}
                fontStyle="italic"
              >
                Member details unavailable.
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>

      {/* ── Spacer ───────────────────────────────────── */}
      <Box flex={1} />

      {/* ── Actions ──────────────────────────────────── */}
      <Flex direction="column" gap={2} flexShrink={0}>
        <Button
          w="full"
          h={10}
          bg={activeTab === "transfer" ? "white" : "rgba(255,255,255,0.06)"}
          color={activeTab === "transfer" ? "brand.emphasis" : "brand.text"}
          border="1px solid"
          borderColor={
            activeTab === "transfer" ? "transparent" : "rgba(255,255,255,0.1)"
          }
          fontFamily="body"
          fontSize="sm"
          fontWeight="medium"
          _hover={
            activeTab === "transfer"
              ? {}
              : { bg: "rgba(255,255,255,0.1)", color: "white" }
          }
          transition="background 0.15s, color 0.15s, border-color 0.15s"
          onClick={() => onTabChange("transfer")}
        >
          <Send size={14} />
          Shielded Transfer
        </Button>

        <Flex gap={2}>
          {(["deposit", "withdraw"] as const).map((tab) => (
            <Button
              key={tab}
              flex={1}
              h={10}
              bg={activeTab === tab ? "white" : "rgba(255,255,255,0.06)"}
              color={activeTab === tab ? "brand.emphasis" : "brand.text"}
              border="1px solid"
              borderColor={
                activeTab === tab ? "transparent" : "rgba(255,255,255,0.1)"
              }
              fontFamily="body"
              fontSize="sm"
              fontWeight="medium"
              _hover={
                activeTab === tab
                  ? {}
                  : { bg: "rgba(255,255,255,0.1)", color: "white" }
              }
              transition="background 0.15s, color 0.15s, border-color 0.15s"
              onClick={() => onTabChange(tab)}
            >
              {tab === "deposit" ? (
                <ArrowDownLeft size={14} />
              ) : (
                <ArrowUpRight size={14} />
              )}
              {tab === "deposit" ? "Deposit" : "Withdraw"}
            </Button>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
