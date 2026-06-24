"use client";

import {
  Box,
  Button,
  Flex,
  Separator,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useWallet } from "@/context/wallet-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MultisigCard, type MultisigGroup } from "./multisig-card";
import { SessionList } from "./session-list";
import { getGroups } from "@/api/groups/getGroups";

// ── Sub-components ─────────────────────────────────────────────────────────

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex direction="column" gap={0.5}>
      <Text
        fontFamily="body"
        fontSize="2xs"
        textTransform="uppercase"
        letterSpacing="widest"
        color="fg.muted"
      >
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xs" color="fg.default" wordBreak="break-all">
        {value}
      </Text>
    </Flex>
  );
}

function ConnectedHeader({
  stellarAddress,
  shieldedAddress,
  onDisconnect,
}: {
  stellarAddress: string;
  shieldedAddress: string;
  onDisconnect: () => void;
}) {
  const shortStellar = `${stellarAddress.slice(0, 8)}…${stellarAddress.slice(-6)}`;
  const shortShielded = `${shieldedAddress.slice(0, 14)}…${shieldedAddress.slice(-10)}`;

  return (
    <Flex direction="column" gap={3}>
      <Flex align="flex-start" justify="space-between" gap={4}>
        <Flex direction="column" gap={3} minW={0} flex={1}>
          <AddressRow label="Stellar Wallet" value={shortStellar} />
          <AddressRow label="Shielded Identity" value={shortShielded} />
        </Flex>
        <Button
          size="sm"
          onClick={onDisconnect}
          flexShrink={0}
        >
          Disconnect
        </Button>
      </Flex>
    </Flex>
  );
}

function EmptyVaults() {
  return (
    <Flex
      flex={1}
      direction="column"
      align="center"
      justify="center"
      gap={3}
      textAlign="center"
      py={16}
    >
      <Text
        fontFamily="mono"
        fontSize="4xl"
        color="border.default"
        aria-hidden="true"
        userSelect="none"
      >
        ✦
      </Text>
      <Text fontFamily="body" fontSize="sm" color="fg.muted">
        No vaults yet
      </Text>
      <Text
        fontFamily="body"
        fontSize="xs"
        color="fg.muted"
        maxW="22rem"
        lineHeight="relaxed"
      >
        Create a new vault or ask a group member to add your shielded address to
        an existing one.
      </Text>
    </Flex>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function WalletPanel() {
  const router = useRouter();
  const { stellarAddress, shielded, connectPhase, connectError, connect, disconnect } =
    useWallet();
  const isConnecting = connectPhase !== "idle" && connectPhase !== "done";

  const shieldedAddress = useMemo(
    () => (shielded ? shielded.shieldedAddress().address.toString() : null),
    [shielded],
  );

  const [groups, setGroups] = useState<MultisigGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (!stellarAddress) {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    getGroups({ address: stellarAddress })
      .then((data) => setGroups(data))
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, [stellarAddress]);

  // ── Disconnected ────────────────────────────────────────────────────────

  if (!stellarAddress || !shielded || !shieldedAddress) {
    return (
      <Box
        as="section"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        w="50%"
        h="full"
        bg="bg.default"
        px={16}
        gap={6}
      >
        <Flex direction="column" align="center" gap={2} textAlign="center">
          <Text
            as="h2"
            fontFamily="heading"
            fontSize="2xl"
            fontWeight="semibold"
            color="fg.default"
          >
            Welcome back
          </Text>
          <Text
            fontFamily="body"
            fontSize="sm"
            color="fg.muted"
            maxW="xs"
            lineHeight="relaxed"
          >
            Connect your Stellar wallet. You&apos;ll sign one message to derive
            your private shielded identity.
          </Text>
        </Flex>

        <Button
          size="lg"
          disabled={isConnecting}
          onClick={connect}
          px={10}
        >
          {isConnecting ? <Spinner as="span" size="sm" color="white" /> : null}
          {connectPhase === "signing"
            ? "Sign to derive keys…"
            : connectPhase === "registering"
              ? "Registering on-chain…"
              : isConnecting
                ? "Connecting…"
                : "Connect Wallet"}
        </Button>

        {connectError && (
          <Text
            fontFamily="body"
            fontSize="xs"
            color="status.danger"
            maxW="xs"
            textAlign="center"
            lineHeight="relaxed"
          >
            {connectError}
          </Text>
        )}
      </Box>
    );
  }

  // ── Connected ───────────────────────────────────────────────────────────

  return (
    <Box
      as="section"
      display="flex"
      flexDirection="column"
      w="50%"
      h="full"
      bg="bg.default"
      px={12}
      py={10}
      gap={6}
      overflowY="auto"
    >
      <ConnectedHeader
        stellarAddress={stellarAddress}
        shieldedAddress={shieldedAddress}
        onDisconnect={disconnect}
      />

      <Separator borderColor="border.subtle" />

      <SessionList />

      <Separator borderColor="border.subtle" />

      <Flex align="center" justify="space-between">
        <Text
          as="h2"
          fontFamily="heading"
          fontSize="xl"
          fontWeight="semibold"
          color="fg.default"
        >
          My Vaults
        </Text>
        <Button
          size="sm"
          onClick={() => router.push("/vault/new")}
        >
          + New Vault
        </Button>
      </Flex>

      <Flex direction="column" flex={1} minH={0} gap={2}>
        {loadingGroups ? (
          <Flex flex={1} align="center" justify="center" py={16}>
            <Spinner size="sm" color="brand.solid" />
          </Flex>
        ) : groups.length === 0 ? (
          <EmptyVaults />
        ) : (
          groups.map((g) => <MultisigCard key={g.id} group={g} />)
        )}
      </Flex>
    </Box>
  );
}
