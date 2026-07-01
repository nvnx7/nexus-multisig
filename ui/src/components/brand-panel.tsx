import { Box, Flex, Text } from "@chakra-ui/react";

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

const FEATURES = [
  {
    title: "Multi-party vaults",
    desc: "Pool funds as a group and require approvals from multiple members before any transaction moves.",
  },
  {
    title: "Private balances",
    desc: "Vault balances and transfers stay confidential — never exposed on the public ledger.",
  },
  {
    title: "Non-custodial",
    desc: "No third party ever controls your keys or holds your funds. Always.",
  },
];

export function BrandPanel() {
  return (
    <Box
      as="section"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      w="50%"
      h="full"
      bg="brand.emphasis"
      px={14}
      flexShrink={0}
    >
      {/* ── Hero ── */}
      <Flex direction="column" align="center" gap={4} textAlign="center">
        <Box w={14} h={14} color="brand.inverseText" opacity={0.8}>
          <NexusMark width="100%" height="100%" />
        </Box>

        <Flex direction="column" align="center" gap={1.5}>
          <Text
            fontFamily="mono"
            fontSize="10px"
            letterSpacing="0.18em"
            textTransform="uppercase"
            color="brand.text"
            opacity={0.6}
          >
            Private Multisig
          </Text>
          <Text
            as="h1"
            fontFamily="heading"
            fontSize="5xl"
            fontWeight="semibold"
            letterSpacing="-0.03em"
            color="white"
            lineHeight={1}
          >
            Nexus
          </Text>
        </Flex>

        <Text
          fontFamily="body"
          fontSize="sm"
          lineHeight="tall"
          color="brand.text"
          maxW="19rem"
          opacity={0.9}
        >
          Multi-party vaults where funds move only when your team agrees — private, secure, fully on-chain.
        </Text>
      </Flex>

      {/* ── Divider ── */}
      <Box h="1px" bg="rgba(255,255,255,0.07)" my={10} w="full" maxW="22rem" />

      {/* ── Features ── */}
      <Flex direction="column" gap={6} w="full" maxW="22rem">
        {FEATURES.map(({ title, desc }) => (
          <Flex key={title} gap={3.5} align="flex-start">
            <Box
              w="5px"
              h="5px"
              bg="brand.text"
              borderRadius="full"
              mt="7px"
              flexShrink={0}
              opacity={0.5}
            />
            <Flex direction="column" gap={0.5}>
              <Text fontFamily="heading" fontSize="sm" fontWeight="medium" color="white">
                {title}
              </Text>
              <Text fontFamily="body" fontSize="xs" color="brand.text" lineHeight="tall" opacity={0.8}>
                {desc}
              </Text>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
