"use client";

import { Badge, Box, Flex, Text } from "@chakra-ui/react";
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
  const short = `${group.group_address.slice(0, 10)}…${group.group_address.slice(-8)}`;

  return (
    <Box
      borderWidth={1}
      borderColor="border.default"
      rounded="md"
      bg="bg.default"
      cursor="pointer"
      transition="background-color 0.15s"
      _hover={{ bg: "bg.subtle", boxShadow: "shadow.hover" }}
      onClick={() => router.push(`/vault/${group.group_address}`)}
    >
      <Flex align="center" justify="space-between" gap={4} px={4} py={3}>
        <Flex direction="column" gap={0.5} minW={0} flex={1}>
          <Text
            fontFamily="mono"
            fontSize="xs"
            color="fg.default"
            truncate
          >
            {short}
          </Text>
          <Text fontFamily="body" fontSize="xs" color="fg.muted">
            {group.threshold} of {group.total} · requires {group.threshold} signatures
          </Text>
        </Flex>
        <Badge
          variant="subtle"
          colorPalette="green"
          fontFamily="mono"
          fontSize="2xs"
          flexShrink={0}
        >
          {group.threshold}-of-{group.total}
        </Badge>
      </Flex>
    </Box>
  );
}
