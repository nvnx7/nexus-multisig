import { Box } from "@chakra-ui/react";
import { BrandPanel } from "@/components/brand-panel";
import { WalletPanel } from "@/components/wallet-panel";

export default function Home() {
  return (
    <Box as="main" display="flex" flex={1} h="full" minH="0" overflow="hidden">
      <BrandPanel />
      <WalletPanel />
    </Box>
  );
}
