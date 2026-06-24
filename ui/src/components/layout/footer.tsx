import { Box, Flex, HStack, Text } from "@chakra-ui/react";

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
        {/* Copyright */}
        <Text fontFamily="body" fontSize="2xs" color="fg.muted">
          &copy; {new Date().getFullYear()} Nexus Financial Systems. All rights reserved.
        </Text>

        {/* Links & Network */}
        <HStack gap={4}>
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
          <Text
            fontFamily="body"
            fontSize="2xs"
            color="fg.muted"
            cursor="pointer"
            _hover={{ color: "brand.solid" }}
            transition="color 0.2s"
          >
            Security
          </Text>
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
