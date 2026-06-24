"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { getGroup, type GroupDetail } from "@/api/groups/getGroup";

export function CompleteStep({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupDetail | null>(null);

  useEffect(() => {
    getGroup(groupId).then(setGroup).catch(() => {});
  }, [groupId]);

  if (!group) {
    return (
      <Flex align="center" justify="center" py={12}>
        <Spinner size="sm" color="brand.solid" />
      </Flex>
    );
  }

  const shortAddr = `${group.agg_address.slice(0, 18)}…${group.agg_address.slice(-14)}`;

  return (
    <Flex direction="column" align="center" gap={8} py={4}>
      {/* Success icon */}
      <Flex
        w={16}
        h={16}
        rounded="full"
        bg="status.successBg"
        align="center"
        justify="center"
      >
        <Box color="status.success">
          <CheckCircle2 size={32} />
        </Box>
      </Flex>

      {/* Title + description */}
      <Flex direction="column" align="center" gap={2} textAlign="center">
        <Text
          as="h3"
          fontFamily="heading"
          fontSize="xl"
          fontWeight="semibold"
          color="fg.default"
        >
          Vault created
        </Text>
        <Text
          fontFamily="body"
          fontSize="sm"
          color="fg.muted"
          maxW="xs"
          lineHeight="relaxed"
        >
          Your {group.threshold}-of-{group.total} multisig vault is ready. All
          participants can now co-sign transactions.
        </Text>
      </Flex>

      {/* Vault details card */}
      <Flex
        direction="column"
        w="full"
        gap={3}
        p={4}
        rounded="md"
        bg="bg.subtle"
        borderWidth={1}
        borderColor="border.default"
      >
        <Flex direction="column" gap={0.5}>
          <Text
            fontFamily="body"
            fontSize="2xs"
            textTransform="uppercase"
            letterSpacing="widest"
            color="fg.muted"
          >
            Vault address
          </Text>
          <Text fontFamily="mono" fontSize="xs" color="fg.default" wordBreak="break-all">
            {shortAddr}
          </Text>
        </Flex>
        <Flex direction="column" gap={0.5}>
          <Text
            fontFamily="body"
            fontSize="2xs"
            textTransform="uppercase"
            letterSpacing="widest"
            color="fg.muted"
          >
            Policy
          </Text>
          <Text fontFamily="mono" fontSize="xs" color="fg.default">
            {group.threshold} of {group.total} signatures
          </Text>
        </Flex>
      </Flex>

      {/* CTA */}
      <Button
        w="full"
        onClick={() => router.push("/")}
      >
        Back to Home
      </Button>
    </Flex>
  );
}
