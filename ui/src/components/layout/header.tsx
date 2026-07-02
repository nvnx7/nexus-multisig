"use client";

import { useWallet } from "@/context/wallet-context";
import { useNativeBalance } from "@/api/account";
import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { LogOut, Wallet } from "lucide-react";
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
  const router = useRouter();
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
      position="relative"
      w="full"
      h="14"
      bg="bg.default"
      borderBottomWidth="1px"
      borderColor="border.default"
      boxShadow="surface"
      px={8}
      flexShrink={0}
      zIndex={10}
    >
      {/* Top brand accent line */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="2px"
        bgImage="linear-gradient(90deg, #0d4732 0%, #52a07d 50%, #0d4732 100%)"
      />

      <Flex h="full" align="center" justify="space-between">
        {/* ── Brand ── */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <HStack gap={2.5} align="center" role="group">
            <Flex
              w={8}
              h={8}
              rounded="lg"
              align="center"
              justify="center"
              bg="brand.solid"
              color="white"
              boxShadow="surface"
              flexShrink={0}
              transition="transform 0.2s"
              _groupHover={{ transform: "rotate(90deg)" }}
            >
              <NexusMark width="18" height="18" />
            </Flex>
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
                letterSpacing="0.14em"
                textTransform="uppercase"
                color="brand.solid"
                bg="brand.subtle"
                px={1.5}
                py="1px"
                rounded="full"
                pb="2px"
              >
                multisig
              </Text>
            </HStack>
          </HStack>
        </Link>

        {/* ── Nav ── */}
        <HStack gap={1} position="absolute" left="50%" transform="translateX(-50%)">
          {NAV_LINKS.map(({ label, href, exact, external }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                style={{ textDecoration: "none" }}
              >
                <Box
                  px={3.5}
                  py={1.5}
                  rounded="full"
                  bg={isActive ? "brand.subtle" : "transparent"}
                  transition="background 0.15s, color 0.15s"
                  _hover={{ bg: isActive ? "brand.subtle" : "bg.subtle" }}
                >
                  <Text
                    fontFamily="body"
                    fontSize="sm"
                    fontWeight={isActive ? "semibold" : "medium"}
                    color={isActive ? "brand.solid" : "fg.muted"}
                  >
                    {label}
                  </Text>
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
                pl={1.5}
                pr={3}
                py={1}
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="full"
              >
                {/* Gradient avatar orb */}
                <Box position="relative" w={6} h={6} flexShrink={0}>
                  <Box
                    w={6}
                    h={6}
                    rounded="full"
                    bgImage="linear-gradient(135deg, #52a07d 0%, #0d4732 100%)"
                    boxShadow="inset 0 0 0 1px rgba(255,255,255,0.15)"
                  />
                  <Box
                    position="absolute"
                    bottom="-1px"
                    right="-1px"
                    w={2}
                    h={2}
                    rounded="full"
                    bg="status.success"
                    borderWidth="1.5px"
                    borderColor="bg.subtle"
                  />
                </Box>
                <Flex direction="column" gap={0} lineHeight={1}>
                  <Text fontFamily="mono" fontSize="2xs" color="fg.default" letterSpacing="0.01em" fontWeight="medium">
                    {shortAddress}
                  </Text>
                  {nativeBalance != null && (
                    <Text fontFamily="mono" fontSize="9px" color="fg.muted" mt="1px">
                      {nativeBalance} XLM
                    </Text>
                  )}
                </Flex>
              </HStack>
              <Button
                size="sm"
                variant="solid"
                fontFamily="body"
                fontSize="xs"
                onClick={handleDisconnect}
              >
                <LogOut size={13} />
                Disconnect
              </Button>
            </>
          ) : (
            <HStack
              gap={2}
              px={3}
              py={2}
              bg="status.warningBg"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="full"
            >
              <Box color="status.warning" display="flex">
                <Wallet size={13} />
              </Box>
              <Text fontFamily="body" fontSize="2xs" color="status.warning" fontWeight="semibold">
                Not connected
              </Text>
            </HStack>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
