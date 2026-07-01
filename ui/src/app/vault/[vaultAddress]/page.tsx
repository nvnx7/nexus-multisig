"use client";

import { use } from "react";
import { Box } from "@chakra-ui/react";
import { VaultDetailsDashboard } from "@/components/vault-details/vault-details-dashboard";

interface PageProps {
  params: Promise<{ vaultAddress: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default function VaultPage({ params, searchParams }: PageProps) {
  const { vaultAddress } = use(params);
  const { tab } = use(searchParams);

  return (
    <Box as="main" display="flex" flex={1} h="full" minH="0" overflow="hidden">
      <VaultDetailsDashboard vaultAddress={vaultAddress} initialTab={tab} />
    </Box>
  );
}
