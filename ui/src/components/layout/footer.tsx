import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { BookText } from "lucide-react";
import Link from "next/link";

function NexusMark(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5.5" y1="5.5" x2="26.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26.5" y1="5.5" x2="5.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

export function Footer() {
  return (
    <Box
      as="footer"
      w="full"
      h="12"
      bg="bg.default"
      borderTopWidth="1px"
      borderColor="border.default"
      px={8}
      flexShrink={0}
    >
      <Flex h="full" align="center" justify="space-between">
        {/* ── Left: Brand ── */}
        <HStack gap={2.5}>
          <Flex
            w={5}
            h={5}
            rounded="md"
            align="center"
            justify="center"
            bg="brand.subtle"
            color="brand.solid"
            flexShrink={0}
          >
            <NexusMark width="12" height="12" />
          </Flex>
          <Text fontFamily="body" fontSize="2xs" color="fg.muted">
            <Text as="span" color="fg.default" fontWeight="semibold">
              Nexus Multisig
            </Text>
            {"  ·  "}
            &copy; {new Date().getFullYear()}
          </Text>
        </HStack>

        {/* ── Right: Links + Network ── */}
        <HStack gap={5} align="center">
          <Link
            href="https://github.com/nvnx7/nexus-multisig"
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <HStack
              gap={1.5}
              color="fg.muted"
              _hover={{ color: "fg.default" }}
              transition="color 0.15s"
            >
              <BookText size={13} />
              <Text fontFamily="body" fontSize="2xs" fontWeight="medium">
                Documentation
              </Text>
            </HStack>
          </Link>

          <Box w="1px" h={3.5} bg="border.default" />

          <HStack
            gap={1.5}
            px={2.5}
            py={1}
            rounded="full"
            bg="status.successBg"
            borderWidth="1px"
            borderColor="border.default"
          >
            <Box
              w="6px"
              h="6px"
              rounded="full"
              bg="status.success"
              animation="nexus-pulse 2s ease-in-out infinite"
            />
            <Text
              fontFamily="mono"
              fontSize="9px"
              fontWeight="bold"
              color="status.success"
              letterSpacing="0.08em"
              textTransform="uppercase"
            >
              Testnet
            </Text>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
}
