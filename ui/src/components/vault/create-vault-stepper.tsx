"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Check, Copy, Shield } from "lucide-react";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { ConfigureStep } from "./configure-step";
import { CommitStep } from "./commit-step";
import { ShareStep } from "./share-step";
import { FinalizeStep } from "./finalize-step";

const STATUS_STEP_INDEX: Record<string, number> = {
  round1: 2,
  round2: 3,
  complete: 4,
};

const STEPS = [
  { label: "Configure", desc: "Set up members and approval policy" },
  { label: "Commit", desc: "Each member submits their security key" },
  { label: "Share", desc: "Exchange approval keys securely" },
  { label: "Activate", desc: "Register and activate the vault" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontFamily="mono"
      fontSize="9px"
      letterSpacing="0.14em"
      textTransform="uppercase"
      color="brand.text"
      opacity={0.7}
    >
      {children}
    </Text>
  );
}

function StepItem({
  num,
  label,
  desc,
  done,
  active,
  isLast,
}: {
  num: number;
  label: string;
  desc: string;
  done: boolean;
  active: boolean;
  isLast: boolean;
}) {
  return (
    <Flex gap={3} align="flex-start">
      <Flex direction="column" align="center" flexShrink={0}>
        <Flex
          w={7}
          h={7}
          rounded="full"
          align="center"
          justify="center"
          fontSize="2xs"
          fontWeight="bold"
          transition="all 0.25s"
          bg={done ? "rgba(82,160,125,0.85)" : active ? "white" : "rgba(255,255,255,0.08)"}
          color={done ? "white" : active ? "brand.solid" : "rgba(255,255,255,0.3)"}
          borderWidth="1px"
          borderColor={done ? "rgba(82,160,125,0.4)" : active ? "white" : "rgba(255,255,255,0.12)"}
          boxShadow={active ? "0 0 0 3px rgba(255,255,255,0.14)" : undefined}
        >
          {done ? <Check size={12} strokeWidth={2.5} /> : num}
        </Flex>
        {!isLast && (
          <Box
            w="1px"
            h={7}
            mt={1.5}
            mb={1.5}
            bg={done ? "rgba(82,160,125,0.45)" : "rgba(255,255,255,0.1)"}
            transition="background-color 0.25s"
          />
        )}
      </Flex>
      <Flex direction="column" pt="3px" pb={isLast ? 0 : 5}>
        <Text
          fontFamily="body"
          fontSize="sm"
          fontWeight={active ? "semibold" : "medium"}
          color={done ? "rgba(255,255,255,0.6)" : active ? "white" : "rgba(255,255,255,0.28)"}
          transition="color 0.2s"
        >
          {label}
        </Text>
        {active && (
          <Text
            fontFamily="body"
            fontSize="2xs"
            color="rgba(255,255,255,0.42)"
            mt={0.5}
            lineHeight="relaxed"
          >
            {desc}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}

export function CreateVaultStepper() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string | undefined;
  const [copied, setCopied] = useState(false);

  const { shielded, isHydrated } = useWallet();

  const { data: session } = useGetDkgSession({ sessionId, poll: true });

  useEffect(() => {
    if (isHydrated && !shielded) router.replace("/");
  }, [isHydrated, shielded, router]);

  if (!isHydrated || !shielded) return null;

  const currentStep = sessionId
    ? (session ? (STATUS_STEP_INDEX[session.status] ?? 1) : 1)
    : 1;

  function handleCopySession() {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const stepContent = [
    <ConfigureStep key="configure" />,
    sessionId ? <CommitStep key="commit" sessionId={sessionId} /> : null,
    sessionId ? <ShareStep key="share" sessionId={sessionId} /> : null,
    sessionId ? <FinalizeStep key="finalize" sessionId={sessionId} /> : null,
  ];

  const activeContent = stepContent[currentStep - 1];

  return (
    <Flex as="main" flex={1} h="full" minH="0" overflow="hidden" w="full">
      {/* ── Left panel (mirrors vault summary panel sizing) ── */}
      <Flex
        as="section"
        direction="column"
        w="50%"
        h="full"
        bg="brand.emphasis"
        px={10}
        pt={9}
        pb={8}
        gap={5}
        flexShrink={0}
        position="relative"
        overflow="hidden"
      >
        {/* Depth overlay */}
        <Box
          position="absolute"
          inset={0}
          bgImage="radial-gradient(ellipse at 15% 85%, rgba(255,255,255,0.04) 0%, transparent 55%), radial-gradient(ellipse at 85% 15%, rgba(0,0,0,0.13) 0%, transparent 50%)"
          pointerEvents="none"
        />

        {/* Back */}
        <Button
          size="sm"
          variant="ghost"
          color="rgba(255,255,255,0.6)"
          _hover={{ color: "white", bg: "rgba(255,255,255,0.08)" }}
          onClick={() => router.push("/")}
          alignSelf="flex-start"
          px={2}
          gap={1.5}
          flexShrink={0}
          position="relative"
          zIndex={1}
        >
          <ArrowLeft size={14} />
          Back
        </Button>

        {/* Title */}
        <Flex direction="column" gap={0.5} flexShrink={0}>
          <Flex align="center" gap={3}>
            <Flex
              w={9}
              h={9}
              rounded="xl"
              bg="rgba(255,255,255,0.08)"
              borderWidth="1px"
              borderColor="rgba(255,255,255,0.12)"
              align="center"
              justify="center"
              color="white"
              flexShrink={0}
            >
              <Shield size={18} />
            </Flex>
            <Text
              as="h1"
              fontFamily="heading"
              fontSize="2xl"
              fontWeight="semibold"
              letterSpacing="-0.01em"
              color="white"
            >
              Create Vault
            </Text>
          </Flex>
          <Text fontFamily="body" fontSize="xs" color="brand.text" opacity={0.75} mt={1}>
            Set up a new multi-party vault requiring multiple approvals for every transaction.
          </Text>
        </Flex>

        {/* Session ID — immediately below header */}
        {sessionId && (
          <Flex
            direction="column"
            gap={2}
            bg="rgba(255,255,255,0.03)"
            border="1px solid"
            borderColor="rgba(255,255,255,0.07)"
            rounded="lg"
            px={4}
            py={3.5}
            flexShrink={0}
          >
            <SectionLabel>Session ID</SectionLabel>
            <Flex align="flex-start" gap={3}>
              <Text
                fontFamily="mono"
                fontSize="xs"
                color="rgba(255,255,255,0.75)"
                flex={1}
                wordBreak="break-all"
                lineHeight="1.65"
              >
                {sessionId}
              </Text>
              <Button
                size="xs"
                variant="ghost"
                color={copied ? "white" : "brand.text"}
                _hover={{ bg: "rgba(255,255,255,0.08)", color: "white" }}
                flexShrink={0}
                mt={0.5}
                onClick={handleCopySession}
                gap={1}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </Flex>
            <Text fontFamily="body" fontSize="2xs" color="brand.text" opacity={0.5}>
              Share with other vault members so they can join the setup.
            </Text>
          </Flex>
        )}

        {/* Divider */}
        <Box w="full" h="1px" bg="rgba(255,255,255,0.08)" flexShrink={0} />

        {/* Vertical step progress */}
        <Flex direction="column" flex={1}>
          {STEPS.map((step, idx) => (
            <StepItem
              key={step.label}
              num={idx + 1}
              label={step.label}
              desc={step.desc}
              done={idx + 1 < currentStep}
              active={idx + 1 === currentStep}
              isLast={idx === STEPS.length - 1}
            />
          ))}
        </Flex>
      </Flex>

      {/* ── Right panel (mirrors vault form panel) ── */}
      <Box
        as="section"
        w="50%"
        h="full"
        bg="bg.default"
        px={12}
        py={10}
        overflowY="auto"
      >
        {activeContent ?? (
          <Flex align="center" justify="center" h="full">
            <Spinner color="brand.solid" />
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
