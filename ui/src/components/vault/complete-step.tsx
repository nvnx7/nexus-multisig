"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { CheckCircle2, ArrowRight } from "lucide-react";
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

  const shortAddr = `${group.group_address.slice(0, 18)}…${group.group_address.slice(-14)}`;

  return (
    <Flex direction="column" align="center" gap={8} py={4}>
      {/* Success icon */}
      <Flex direction="column" align="center" gap={1}>
        <Flex
          w={18}
          h={18}
          rounded="full"
          bg="status.successBg"
          align="center"
          justify="center"
        >
          <Box color="status.success">
            <CheckCircle2 size={36} />
          </Box>
        </Flex>
      </Flex>

      {/* Title + description */}
      <Flex direction="column" align="center" gap={2} textAlign="center">
        <Text
          as="h3"
          fontFamily="heading"
          fontSize="2xl"
          fontWeight="semibold"
          color="fg.default"
          letterSpacing="-0.01em"
        >
          Vault is live!
        </Text>
        <Text
          fontFamily="body"
          fontSize="sm"
          color="fg.muted"
          maxW="xs"
          lineHeight="relaxed"
        >
          Your {group.threshold}-of-{group.total} vault is ready. All members can now co-sign transactions.
        </Text>
      </Flex>

      {/* Vault details */}
      <Flex
        direction="column"
        w="full"
        gap={0}
        rounded="xl"
        overflow="hidden"
        borderWidth={1}
        borderColor="border.default"
        boxShadow="surface"
      >
        <Flex
          direction="column"
          gap={0.5}
          px={4}
          py={3}
          borderBottomWidth={1}
          borderColor="border.default"
          bg="bg.subtle"
        >
          <Text
            fontFamily="body"
            fontSize="2xs"
            textTransform="uppercase"
            letterSpacing="widest"
            color="fg.muted"
            fontWeight="semibold"
          >
            Vault address
          </Text>
          <Text fontFamily="mono" fontSize="xs" color="fg.default" wordBreak="break-all">
            {shortAddr}
          </Text>
        </Flex>
        <Flex
          direction="column"
          gap={0.5}
          px={4}
          py={3}
          bg="bg.default"
        >
          <Text
            fontFamily="body"
            fontSize="2xs"
            textTransform="uppercase"
            letterSpacing="widest"
            color="fg.muted"
            fontWeight="semibold"
          >
            Approval policy
          </Text>
          <Text fontFamily="mono" fontSize="sm" color="fg.default" fontWeight="semibold">
            {group.threshold} of {group.total} signatures required
          </Text>
        </Flex>
      </Flex>

      {/* CTA */}
      <Button
        w="full"
        h={10}
        gap={2}
        onClick={() => router.push("/")}
      >
        Go to Dashboard
        <ArrowRight size={15} />
      </Button>
    </Flex>
  );
}
