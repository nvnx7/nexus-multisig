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
      px={6}
      flexShrink={0}
    >
      <Flex h="full" align="center" justify="space-between">
        <Text fontFamily="body" fontSize="2xs" color="fg.muted">
          Nexus Multisig
        </Text>

        <HStack gap={4}>
          <Link href="https://github.com/nvnx7/nexus-multisig" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Text
              fontFamily="body"
              fontSize="2xs"
              color="fg.muted"
              cursor="pointer"
              _hover={{ color: "brand.solid" }}
              transition="color 0.2s"
            >
              Documentation
            </Text>
          </Link>
          <Box
            px={2}
            py={0.5}
            bg="status.successBg"
            borderRadius="full"
          >
            <Text fontFamily="mono" fontSize="3xs" fontWeight="bold" color="status.success">
              TESTNET
            </Text>
          </Box>
        </HStack>
      </Flex>
    </Box>
  );
}
