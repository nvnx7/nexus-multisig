"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { useWallet } from "@/context/wallet-context";
import { useGetDkgSession } from "@/api/dkg/getDkgSession";
import { Stepper, type Step } from "@/components/ui/stepper";
import { ConfigureStep } from "./configure-step";
import { CommitStep } from "./commit-step";
import { ShareStep } from "./share-step";
import { FinalizeStep } from "./finalize-step";

const STATUS_STEPPER_INDEX: Record<string, number> = {
  round1: 2,
  round2: 3,
  complete: 4,
};

export function CreateVaultStepper() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string | undefined;

  const { shielded, isHydrated } = useWallet();

  const { data: session } = useGetDkgSession({
    sessionId,
    poll: true,
  });

  useEffect(() => {
    if (isHydrated && !shielded) router.replace("/");
  }, [isHydrated, shielded, router]);

  if (!isHydrated || !shielded) return null;

  // Step 1 when no session yet; otherwise derive from session status
  const currentStep = sessionId
    ? (session ? (STATUS_STEPPER_INDEX[session.status] ?? 1) : 1)
    : 1;

  const isWaiting = !!session && session.status !== "complete";

  const steps: Step[] = [
    {
      label: "Configure",
      content: <ConfigureStep />,
    },
    {
      label: "Commit",
      content: sessionId ? <CommitStep sessionId={sessionId} /> : null,
    },
    {
      label: "Share",
      content: sessionId ? <ShareStep sessionId={sessionId} /> : null,
    },
    {
      label: "Finalize",
      content: sessionId ? <FinalizeStep sessionId={sessionId} /> : null,
    },
  ];

  return (
    <Box as="main" flex={1} bg="bg.canvas" display="flex" flexDirection="column">
      {/* Header */}
      <Flex
        as="header"
        align="center"
        gap={3}
        px={8}
        py={5}
        borderBottomWidth={1}
        borderColor="border.subtle"
      >
        <Button
          size="sm"
          onClick={() => router.push("/")}
          disabled={isWaiting}
        >
          <ArrowLeft size={14} />
          Back
        </Button>
        <Text color="border.default">/</Text>
        <Text fontFamily="heading" fontSize="sm" fontWeight="medium" color="fg.default">
          New Vault
        </Text>
      </Flex>

      {/* Content */}
      <Flex direction="column" align="center" flex={1} px={6} py={10}>
        <Box w="full" maxW="lg">
          <Stepper steps={steps} currentStep={currentStep} />
        </Box>
      </Flex>
    </Box>
  );
}
