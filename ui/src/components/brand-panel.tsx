import { Box, Flex, Text } from "@chakra-ui/react";

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

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <Flex direction="column" align="center" gap={1}>
      <Text
        fontFamily="mono"
        fontSize="2xs"
        letterSpacing="widest"
        textTransform="uppercase"
        color="brand.text"
      >
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xs" fontWeight="medium" color="white">
        {value}
      </Text>
    </Flex>
  );
}

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
      px={16}
      gap={10}
      flexShrink={0}
    >
      <Flex direction="column" align="center" gap={6} textAlign="center">
        <Box w={14} h={14} color="brand.inverseText">
          <StellarMark width="100%" height="100%" />
        </Box>

        <Flex direction="column" gap={3}>
          <Text
            as="h1"
            fontFamily="heading"
            fontSize="4xl"
            fontWeight="semibold"
            letterSpacing="tighter"
            color="white"
          >
            Nexus
          </Text>
          <Text
            fontFamily="body"
            fontSize="sm"
            lineHeight="relaxed"
            color="brand.text"
            maxW="22rem"
          >
            Institutional-grade threshold signature wallets. Private by design,
            cryptographically verifiable, fully non-custodial.
          </Text>
        </Flex>
      </Flex>

      <Flex
        gap={8}
        borderTopWidth={1}
        borderColor="brand.muted"
        pt={8}
      >
        <StatPill label="Signature scheme" value="FROST" />
        <StatPill label="Privacy layer" value="ZK Proofs" />
        <StatPill label="Curve" value="BabyJubJub" />
      </Flex>
    </Box>
  );
}
