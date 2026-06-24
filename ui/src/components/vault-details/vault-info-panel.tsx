import { Badge, Box, Button, Flex, Separator, Text } from "@chakra-ui/react";
import {
  ArrowLeft,
  Copy,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

interface Member {
  address: string;
}

interface VaultInfoPanelProps {
  vaultAddress: string;
  balance: number;
  threshold: number;
  total: number;
  members: Member[];
  activeTab: "deposit" | "withdraw" | "transfer";
  onTabChange: (tab: "deposit" | "withdraw" | "transfer") => void;
  onCopyAddress: () => void;
  onBack: () => void;
  userAddress?: string;
}

export function VaultInfoPanel({
  vaultAddress,
  balance,
  threshold,
  total,
  members,
  activeTab,
  onTabChange,
  onCopyAddress,
  onBack,
  userAddress,
}: VaultInfoPanelProps) {
  return (
    <Box
      as="section"
      display="flex"
      flexDirection="column"
      w="50%"
      h="full"
      bg="brand.emphasis"
      px={12}
      py={10}
      gap={8}
      flexShrink={0}
      overflowY="auto"
    >
      {/* Back navigation */}
      <Button
        size="sm"
        variant="ghost"
        color="brand.text"
        _hover={{ bg: "rgba(255, 255, 255, 0.08)", color: "white" }}
        onClick={onBack}
        alignSelf="flex-start"
        px={3}
      >
        <ArrowLeft size={14} />
        Dashboard
      </Button>

      {/* Vault details */}
      <Flex direction="column" gap={1.5}>
        <Flex align="center" gap={3}>
          <Text as="h1" fontFamily="heading" fontSize="2xl" fontWeight="semibold" color="white">
            Nexus Vault
          </Text>
          <Badge colorPalette="green" variant="outline" borderColor="brand.muted" color="brand.text" fontSize="2xs" px={2} py={0.5}>
            Active
          </Badge>
        </Flex>
        <Text fontFamily="body" fontSize="xs" color="brand.text">
          Stellar Threshold Vault Group
        </Text>
      </Flex>

      {/* Address & copy tool */}
      <Flex direction="column" gap={1.5}>
        <Text fontFamily="mono" fontSize="2xs" letterSpacing="widest" textTransform="uppercase" color="brand.text">
          Vault Shielded Address
        </Text>
        <Flex align="center" gap={2} bg="rgba(255, 255, 255, 0.05)" border="1px solid" borderColor="brand.muted" py={2} px={3} rounded="md">
          <Text fontFamily="mono" fontSize="2xs" color="white" truncate flex={1}>
            {vaultAddress}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            color="brand.text"
            _hover={{ bg: "rgba(255, 255, 255, 0.1)", color: "white" }}
            onClick={onCopyAddress}
            h="auto"
            py={1}
          >
            <Copy size={11} />
            Copy
          </Button>
        </Flex>
      </Flex>

      {/* Balance Display */}
      <Flex direction="column" gap={1} bg="rgba(255, 255, 255, 0.03)" border="1px solid" borderColor="rgba(255, 255, 255, 0.08)" p={5} rounded="lg">
        <Text fontFamily="mono" fontSize="2xs" letterSpacing="widest" textTransform="uppercase" color="brand.text">
          Available Vault Balance
        </Text>
        <Text fontFamily="heading" fontSize="4xl" fontWeight="bold" color="white" mt={1}>
          {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
        </Text>
        <Text fontFamily="body" fontSize="xs" color="brand.text">
          ≈ ${(balance * 0.1).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </Text>
      </Flex>

      {/* Security Policy */}
      <Flex direction="column" gap={3}>
        <Text fontFamily="mono" fontSize="2xs" letterSpacing="widest" textTransform="uppercase" color="brand.text">
          Security Policy
        </Text>
        <Flex direction="column" gap={2} bg="rgba(255, 255, 255, 0.03)" p={4} rounded="md" border="1px solid" borderColor="rgba(255, 255, 255, 0.06)">
          <Flex justify="space-between" align="center">
            <Text fontFamily="body" fontSize="xs" color="brand.text">
              Signing Requirement
            </Text>
            <Badge colorPalette="green" fontFamily="mono" fontSize="2xs" bg="brand.muted" color="white" border="none">
              {threshold}-of-{total} Keys
            </Badge>
          </Flex>
          <Separator borderColor="rgba(255, 255, 255, 0.08)" my={1} />
          <Text fontFamily="body" fontSize="xs" fontWeight="medium" color="white" mb={1}>
            Active Co-signers ({members.length || total})
          </Text>
          <Flex direction="column" gap={1.5}>
            {members.length > 0 ? (
              members.map((m, idx) => (
                <Text key={m.address} fontFamily="mono" fontSize="2xs" color="brand.text" truncate>
                  {idx + 1}. {m.address === userAddress ? `${m.address.slice(0, 12)}…${m.address.slice(-8)} (You)` : `${m.address.slice(0, 12)}…${m.address.slice(-8)}`}
                </Text>
              ))
            ) : (
              <Text fontFamily="body" fontSize="2xs" color="brand.text" fontStyle="italic">
                Session member details unavailable.
              </Text>
            )}
          </Flex>
        </Flex>
      </Flex>

      {/* Vertical Tab Navigation Actions */}
      <Flex direction="column" gap={2} mt="auto">
        <Button
          justifyContent="flex-start"
          px={4}
          py={6}
          bg={activeTab === "deposit" ? "white" : "transparent"}
          color={activeTab === "deposit" ? "brand.emphasis" : "brand.text"}
          border={activeTab === "deposit" ? "none" : "1px solid"}
          borderColor="brand.muted"
          _hover={activeTab === "deposit" ? {} : { bg: "rgba(255, 255, 255, 0.05)", color: "white" }}
          onClick={() => onTabChange("deposit")}
        >
          <ArrowDownLeft size={16} />
          Deposit XLM
        </Button>
        <Button
          justifyContent="flex-start"
          px={4}
          py={6}
          bg={activeTab === "withdraw" ? "white" : "transparent"}
          color={activeTab === "withdraw" ? "brand.emphasis" : "brand.text"}
          border={activeTab === "withdraw" ? "none" : "1px solid"}
          borderColor="brand.muted"
          _hover={activeTab === "withdraw" ? {} : { bg: "rgba(255, 255, 255, 0.05)", color: "white" }}
          onClick={() => onTabChange("withdraw")}
        >
          <ArrowUpRight size={16} />
          Multisig Withdrawal
        </Button>
        <Button
          justifyContent="flex-start"
          px={4}
          py={6}
          bg={activeTab === "transfer" ? "white" : "transparent"}
          color={activeTab === "transfer" ? "brand.emphasis" : "brand.text"}
          border={activeTab === "transfer" ? "none" : "1px solid"}
          borderColor="brand.muted"
          _hover={activeTab === "transfer" ? {} : { bg: "rgba(255, 255, 255, 0.05)", color: "white" }}
          onClick={() => onTabChange("transfer")}
        >
          <Send size={16} />
          Shielded Transfer
        </Button>
      </Flex>
    </Box>
  );
}
