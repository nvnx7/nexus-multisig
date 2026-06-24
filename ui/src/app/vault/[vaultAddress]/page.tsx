"use client";

import { use } from "react";
import { Box } from "@chakra-ui/react";
import { VaultDetailsDashboard } from "@/components/vault-details/vault-details-dashboard";

interface PageProps {
  params: Promise<{ vaultAddress: string }>;
}

export default function VaultPage({ params }: PageProps) {
  const { vaultAddress } = use(params);

  return (
    <Box as="main" display="flex" flex={1} h="full" minH="0" overflow="hidden">
      <VaultDetailsDashboard vaultAddress={vaultAddress} />
    </Box>
  );
}
