"use client";

import { Flex, Text } from "@chakra-ui/react";
import { CopyButton } from "./copy-button";

export function DetailRow({
  label,
  value,
  copyable,
  mono = true,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  const short =
    value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
  return (
    <Flex
      justify="space-between"
      align="center"
      gap={4}
      py={2.5}
      borderBottomWidth={1}
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
    >
      <Text fontSize="xs" color="fg.muted" flexShrink={0}>
        {label}
      </Text>
      <Flex align="center" gap={1}>
        <Text
          fontFamily={mono ? "mono" : "body"}
          fontSize="xs"
          color="fg.default"
          title={value}
        >
          {short}
        </Text>
        {copyable && <CopyButton value={value} />}
      </Flex>
    </Flex>
  );
}
