import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import Link from "next/link";

export function Footer() {
  return (
    <Box
      as="footer"
      w="full"
      h="12"
      bg="bg.default"
      borderTopWidth="1px"
      borderColor="border.subtle"
      px={8}
      flexShrink={0}
    >
      <Flex h="full" align="center" justify="space-between">

        {/* ── Left: Brand ── */}
        <Text fontFamily="body" fontSize="2xs" color="fg.muted">
          &copy; {new Date().getFullYear()}{" "}
          <Text as="span" color="fg.default" fontWeight="medium">
            Nexus Multisig
          </Text>
        </Text>

        {/* ── Right: Links + Network ── */}
        <HStack gap={5} align="center">
          <Link
            href="https://github.com/nvnx7/nexus-multisig"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Text
              fontFamily="body"
              fontSize="2xs"
              color="fg.muted"
              _hover={{ color: "fg.default" }}
              transition="color 0.15s"
            >
              Documentation
            </Text>
          </Link>

          <Box w="1px" h={3} bg="border.default" />

          <HStack gap={1.5}>
            <Box w="5px" h="5px" bg="status.success" borderRadius="full" />
            <Text fontFamily="mono" fontSize="2xs" fontWeight="medium" color="status.success" letterSpacing="0.04em">
              Testnet
            </Text>
          </HStack>
        </HStack>

      </Flex>
    </Box>
  );
}
