"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export interface MultisigGroup {
  id: string;
  threshold: number;
  total: number;
  group_address: string;
  created_at: number;
}

export function MultisigCard({ group }: { group: MultisigGroup }) {
  const router = useRouter();
  const short = `${group.group_address.slice(0, 12)}…${group.group_address.slice(-8)}`;

  return (
    <Box
      borderWidth="1px"
      borderColor="border.default"
      rounded="xl"
      bg="bg.default"
      boxShadow="surface"
      cursor="pointer"
      transition="border-color 0.15s, background 0.15s, box-shadow 0.15s, transform 0.15s"
      _hover={{ borderColor: "border.emphasis", boxShadow: "hover", transform: "translateY(-1px)" }}
      onClick={() => router.push(`/vault/${group.group_address}`)}
    >
      <Flex align="center" gap={3.5} px={4} py={3.5}>
        {/* Icon */}
        <Flex
          w={9}
          h={9}
          bg="brand.subtle"
          borderRadius="lg"
          align="center"
          justify="center"
          flexShrink={0}
        >
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="brand.solid"
            userSelect="none"
            aria-hidden="true"
          >
            ✦
          </Text>
        </Flex>

        {/* Info */}
        <Flex direction="column" gap={0.5} flex={1} minW={0}>
          <Text fontFamily="mono" fontSize="xs" color="fg.default" fontWeight="medium" truncate>
            {short}
          </Text>
          <Text fontFamily="body" fontSize="2xs" color="fg.muted">
            {group.threshold}-of-{group.total} · threshold vault
          </Text>
        </Flex>

        {/* Arrow */}
        <Box color="fg.muted" flexShrink={0}>
          <ChevronRight size={15} />
        </Box>
      </Flex>
    </Box>
  );
}
