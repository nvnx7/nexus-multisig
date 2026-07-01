"use client";

import { use } from "react";
import { Box } from "@chakra-ui/react";
import { SignSessionDashboard } from "@/components/sign-session/sign-session-dashboard";

interface PageProps {
  params: Promise<{ vaultAddress: string; sessionId: string }>;
}

export default function SignSessionPage({ params }: PageProps) {
  const { vaultAddress, sessionId } = use(params);

  return (
    <Box as="main" display="flex" flex={1} h="full" minH="0" overflow="hidden">
      <SignSessionDashboard vaultAddress={vaultAddress} sessionId={sessionId} />
    </Box>
  );
}
