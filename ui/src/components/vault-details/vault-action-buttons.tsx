"use client";

import { Button, Flex } from "@chakra-ui/react";
import { Send, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export type VaultTab = "deposit" | "withdraw" | "transfer";

interface ActionButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  flex?: number;
  w?: string;
}

function ActionButton({ active, onClick, icon, label, flex, w }: ActionButtonProps) {
  return (
    <Button
      flex={flex}
      w={w}
      h={10}
      bg={active ? "white" : "rgba(255,255,255,0.06)"}
      color={active ? "brand.emphasis" : "brand.text"}
      border="1px solid"
      borderColor={active ? "transparent" : "rgba(255,255,255,0.1)"}
      fontFamily="body"
      fontSize="sm"
      fontWeight="medium"
      _hover={active ? {} : { bg: "rgba(255,255,255,0.1)", color: "white" }}
      transition="background 0.15s, color 0.15s, border-color 0.15s"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}

interface VaultActionButtonsProps {
  /** The currently selected tab, or null when none should be highlighted. */
  activeTab?: VaultTab | null;
  onSelect: (tab: VaultTab) => void;
}

/**
 * Deposit / withdraw / transfer actions for the vault summary panel. On the
 * vault page `activeTab` highlights the current form; on the signing page it is
 * left null and `onSelect` navigates back to the vault with that form open.
 */
export function VaultActionButtons({ activeTab = null, onSelect }: VaultActionButtonsProps) {
  return (
    <Flex direction="column" gap={2} flexShrink={0}>
      <ActionButton
        w="full"
        active={activeTab === "transfer"}
        onClick={() => onSelect("transfer")}
        icon={<Send size={14} />}
        label="Shielded Transfer"
      />
      <Flex gap={2}>
        <ActionButton
          flex={1}
          active={activeTab === "deposit"}
          onClick={() => onSelect("deposit")}
          icon={<ArrowDownLeft size={14} />}
          label="Deposit"
        />
        <ActionButton
          flex={1}
          active={activeTab === "withdraw"}
          onClick={() => onSelect("withdraw")}
          icon={<ArrowUpRight size={14} />}
          label="Withdraw"
        />
      </Flex>
    </Flex>
  );
}
