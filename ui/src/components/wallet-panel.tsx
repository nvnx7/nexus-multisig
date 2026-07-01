"use client";

import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useWallet } from "@/context/wallet-context";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { MultisigCard } from "./multisig-card";
import { SessionList } from "./session-list";
import { useGetGroups } from "@/api/groups/getGroups";
import { Plus } from "lucide-react";

// ── Disconnected ───────────────────────────────────────────────────────────

function DisconnectedPanel() {
  const { connectPhase, connectError, connect } = useWallet();
  const isConnecting = connectPhase !== "idle" && connectPhase !== "done";

  const buttonLabel =
    connectPhase === "signing"     ? "Sign to derive keys…"  :
    connectPhase === "registering" ? "Registering on-chain…" :
    isConnecting                   ? "Connecting…"           :
                                     "Connect Wallet";

  return (
    <Flex flex={1} direction="column" align="center" justify="center" px={14} gap={7}>
      <Flex direction="column" align="center" gap={3} textAlign="center">
        <Text
          fontFamily="heading"
          fontSize="2xl"
          fontWeight="semibold"
          letterSpacing="-0.02em"
          color="fg.default"
        >
          Connect your wallet
        </Text>
        <Text fontFamily="body" fontSize="sm" color="fg.muted" maxW="xs" lineHeight="tall">
          Sign in with your Stellar wallet to access your vaults, review proposals, and manage shared funds.
        </Text>
      </Flex>

      <Flex direction="column" align="center" gap={3} w="full" maxW="xs">
        <Button
          size="lg"
          w="full"
          loading={isConnecting}
          disabled={isConnecting}
          onClick={connect}
        >
          {buttonLabel}
        </Button>
        <Text fontFamily="body" fontSize="2xs" color="fg.muted" textAlign="center">
          One signature to derive your private shielded identity. No data leaves your device.
        </Text>
      </Flex>

      {connectError && (
        <Text fontFamily="body" fontSize="xs" color="status.danger" textAlign="center" maxW="xs">
          {connectError}
        </Text>
      )}
    </Flex>
  );
}

// ── Empty vaults ───────────────────────────────────────────────────────────

function EmptyVaults() {
  const router = useRouter();
  return (
    <Flex direction="column" align="center" justify="center" gap={4} py={12} textAlign="center">
      <Flex direction="column" gap={1.5}>
        <Text fontFamily="heading" fontSize="sm" fontWeight="medium" color="fg.default">
          No vaults yet
        </Text>
        <Text fontFamily="body" fontSize="xs" color="fg.muted" maxW="xs" lineHeight="tall">
          Create a vault to start pooling funds with your team.
        </Text>
      </Flex>
      <Button size="sm" variant="outline" mt={1} onClick={() => router.push("/vault/new")}>
        <Plus size={13} />
        Create a vault
      </Button>
    </Flex>
  );
}

// ── Connected ──────────────────────────────────────────────────────────────

function ConnectedPanel({ stellarAddress }: { stellarAddress: string }) {
  const router = useRouter();
  const { data: groups = [], isLoading: loadingGroups } = useGetGroups({ address: stellarAddress });

  return (
    <Flex direction="column" flex={1} minH={0} overflowY="auto" px={12} py={10} gap={8}>

      {/* In-progress vault setups */}
      <SessionList />

      {/* Vaults */}
      <Flex direction="column" gap={5} flex={1} minH={0}>
        <Flex align="center" justify="space-between">
          <Flex direction="column" gap={0.5}>
            <Text
              fontFamily="heading"
              fontSize="lg"
              fontWeight="semibold"
              letterSpacing="-0.01em"
              color="fg.default"
            >
              My Vaults
            </Text>
            {!loadingGroups && groups.length > 0 && (
              <Text fontFamily="body" fontSize="xs" color="fg.muted">
                {groups.length} vault{groups.length !== 1 ? "s" : ""}
              </Text>
            )}
          </Flex>
          <Button size="sm" variant="outline" onClick={() => router.push("/vault/new")}>
            <Plus size={13} />
            New Vault
          </Button>
        </Flex>

        {loadingGroups ? (
          <Flex align="center" justify="center" py={12}>
            <Spinner size="sm" color="brand.solid" />
          </Flex>
        ) : groups.length === 0 ? (
          <EmptyVaults />
        ) : (
          <Flex direction="column" gap={2.5}>
            {groups.map((g) => (
              <MultisigCard key={g.id} group={g} />
            ))}
          </Flex>
        )}
      </Flex>

    </Flex>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export function WalletPanel() {
  const { stellarAddress, shielded, isHydrated } = useWallet();

  const isConnected = useMemo(
    () => !!(stellarAddress && shielded),
    [stellarAddress, shielded],
  );

  return (
    <Box
      as="section"
      display="flex"
      flexDirection="column"
      w="50%"
      h="full"
      bg="bg.default"
      borderLeftWidth="1px"
      borderColor="border.subtle"
      flexShrink={0}
    >
      {!isHydrated ? (
        <Flex flex={1} align="center" justify="center">
          <Spinner size="sm" color="brand.solid" />
        </Flex>
      ) : isConnected ? (
        <ConnectedPanel stellarAddress={stellarAddress!} />
      ) : (
        <DisconnectedPanel />
      )}
    </Box>
  );
}
