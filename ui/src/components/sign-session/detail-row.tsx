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
  const hasValue = !!value && value.length > 0;
  const short =
    hasValue && value.length > 22
      ? `${value.slice(0, 10)}…${value.slice(-8)}`
      : value;

  return (
    <Flex
      justify="space-between"
      align="center"
      gap={4}
      py={3}
      borderBottomWidth={1}
      borderColor="border.subtle"
      _last={{ borderBottomWidth: 0 }}
    >
      <Text
        fontFamily="body"
        fontSize="2xs"
        fontWeight="medium"
        textTransform="uppercase"
        letterSpacing="0.06em"
        color="fg.subtle"
        flexShrink={0}
      >
        {label}
      </Text>
      <Flex align="center" gap={1} minW={0}>
        {hasValue ? (
          <>
            <Text
              fontFamily={mono ? "mono" : "body"}
              fontSize="xs"
              color="fg.default"
              title={value}
              truncate
            >
              {short}
            </Text>
            {copyable && <CopyButton value={value} />}
          </>
        ) : (
          <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
            —
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
