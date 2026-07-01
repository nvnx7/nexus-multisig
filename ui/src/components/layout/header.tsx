"use client";

import { useWallet } from "@/context/wallet-context";
import { useNativeBalance } from "@/api/account";
import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function NexusMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <line x1="16" y1="2"   x2="16" y2="30"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2"  y1="16"  x2="30" y2="16"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5.5"  y1="5.5"  x2="26.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26.5" y1="5.5"  x2="5.5"  y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Home", href: "/", exact: true },
  { label: "Docs", href: "https://github.com/nvnx7/nexus-multisig", external: true },
];

export function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { stellarAddress, disconnect } = useWallet();

  const shortAddress = stellarAddress
    ? `${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}`
    : null;

  const { data: nativeBalance } = useNativeBalance(stellarAddress);

  function handleDisconnect() {
    disconnect();
    router.push("/");
  }

  return (
    <Box
      as="header"
      w="full"
      h="14"
      bg="bg.default"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      px={8}
      flexShrink={0}
    >
      <Flex h="full" align="center" justify="space-between">

        {/* ── Brand ── */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <HStack gap={2.5} align="center">
            <Box w="18px" h="18px" color="brand.solid" flexShrink={0}>
              <NexusMark width="100%" height="100%" />
            </Box>
            <HStack gap={1.5} align="baseline">
              <Text
                fontFamily="heading"
                fontSize="md"
                fontWeight="semibold"
                letterSpacing="-0.01em"
                color="fg.default"
              >
                Nexus
              </Text>
              <Text
                fontFamily="mono"
                fontSize="9px"
                letterSpacing="0.1em"
                textTransform="uppercase"
                color="fg.muted"
                pb="1px"
              >
                multisig
              </Text>
            </HStack>
          </HStack>
        </Link>

        {/* ── Nav ── */}
        <HStack gap={1}>
          {NAV_LINKS.map(({ label, href, exact, external }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                style={{ textDecoration: "none" }}
              >
                <Box position="relative" px={3} py={2}>
                  <Text
                    fontFamily="body"
                    fontSize="sm"
                    fontWeight={isActive ? "medium" : "normal"}
                    color={isActive ? "fg.default" : "fg.muted"}
                    _hover={{ color: "fg.default" }}
                    transition="color 0.15s"
                  >
                    {label}
                  </Text>
                  {isActive && (
                    <Box
                      position="absolute"
                      bottom="-1px"
                      left="50%"
                      transform="translateX(-50%)"
                      w={4}
                      h="2px"
                      bg="brand.solid"
                      borderRadius="full"
                    />
                  )}
                </Box>
              </Link>
            );
          })}
        </HStack>

        {/* ── Wallet ── */}
        <HStack gap={2}>
          {stellarAddress ? (
            <>
              <HStack
                gap={2.5}
                px={3}
                py={1.5}
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="lg"
              >
                <Box w="6px" h="6px" bg="status.success" borderRadius="full" flexShrink={0} />
                <Text fontFamily="mono" fontSize="2xs" color="fg.default" letterSpacing="0.01em">
                  {shortAddress}
                </Text>
                {nativeBalance != null && (
                  <>
                    <Box w="1px" h={3} bg="border.default" />
                    <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                      {nativeBalance} XLM
                    </Text>
                  </>
                )}
              </HStack>
              <Button
                size="xs"
                variant="solid"
                fontFamily="body"
                fontSize="xs"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <HStack
              gap={2}
              px={3}
              py={1.5}
              bg="status.warningBg"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="lg"
            >
              <Box w="6px" h="6px" bg="status.warning" borderRadius="full" flexShrink={0} />
              <Text fontFamily="mono" fontSize="2xs" color="status.warning" fontWeight="medium">
                Not connected
              </Text>
            </HStack>
          )}
        </HStack>

      </Flex>
    </Box>
  );
}
