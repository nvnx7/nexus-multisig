"use client";

import { useWallet } from "@/context/wallet-context";
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
} from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function StellarMark({ ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5.5" y1="5.5" x2="26.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26.5" y1="5.5" x2="5.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { stellarAddress, disconnect } = useWallet();

  function handleDisconnect() {
    disconnect();
    router.push("/");
  }

  const shortAddress = stellarAddress
    ? `${stellarAddress.slice(0, 6)}…${stellarAddress.slice(-4)}`
    : null;

  return (
    <Box
      as="header"
      w="full"
      h="14"
      bg="bg.default"
      borderBottomWidth="1px"
      borderColor="border.subtle"
      px={6}
      flexShrink={0}
    >
      <Flex h="full" align="center" justify="space-between">
        {/* Brand Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <HStack gap={2} cursor="pointer">
            <Box w={5} h={5} color="brand.solid">
              <StellarMark width="100%" height="100%" />
            </Box>
            <Text
              fontFamily="heading"
              fontSize="lg"
              fontWeight="semibold"
              letterSpacing="tight"
              color="fg.default"
            >
              Nexus
            </Text>
          </HStack>
        </Link>

        {/* Navigation Links */}
        <HStack gap={6}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Text
              fontFamily="body"
              fontSize="sm"
              fontWeight={pathname === "/" ? "medium" : "normal"}
              color={pathname === "/" ? "brand.solid" : "fg.muted"}
              _hover={{ color: "brand.solid" }}
              transition="color 0.2s"
            >
              Home
            </Text>
          </Link>
          <Link href="https://github.com/nvnx7/nexus-multisig" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Text
              fontFamily="body"
              fontSize="sm"
              fontWeight="normal"
              color="fg.muted"
              _hover={{ color: "brand.solid" }}
              transition="color 0.2s"
            >
              Docs
            </Text>
          </Link>
        </HStack>

        {/* Wallet Connection Status */}
        <HStack gap={3}>
          {stellarAddress ? (
            <>
              <Box
                px={2.5}
                py={1}
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="md"
              >
                <Text fontFamily="mono" fontSize="2xs" color="fg.muted">
                  {shortAddress}
                </Text>
              </Box>
              <Button size="xs" variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Box
              px={2.5}
              py={1}
              bg="status.warningBg"
              borderRadius="md"
            >
              <Text fontFamily="body" fontSize="2xs" fontWeight="medium" color="status.warning">
                Wallet Disconnected
              </Text>
            </Box>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
