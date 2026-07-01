"use client";

import { VaultSummaryPanel } from "./vault-summary-panel";
import { VaultActionButtons } from "./vault-action-buttons";

interface Member {
  address: string;
}

interface VaultInfoPanelProps {
  vaultAddress: string;
  balance: bigint | null;
  balanceLoading: boolean;
  threshold: number;
  total: number;
  members: Member[];
  activeTab: "deposit" | "withdraw" | "transfer";
  onTabChange: (tab: "deposit" | "withdraw" | "transfer") => void;
  onCopyAddress: () => void;
  onBack: () => void;
  userAddress?: string;
}

/**
 * Left panel for the vault details page: the shared vault summary plus the
 * deposit / withdraw / transfer action buttons that switch the active form.
 */
export function VaultInfoPanel({
  vaultAddress,
  balance,
  balanceLoading,
  threshold,
  total,
  members,
  activeTab,
  onTabChange,
  onCopyAddress,
  userAddress,
}: VaultInfoPanelProps) {
  return (
    <VaultSummaryPanel
      vaultAddress={vaultAddress}
      balance={balance}
      balanceLoading={balanceLoading}
      threshold={threshold}
      total={total}
      members={members}
      onCopyAddress={onCopyAddress}
      userAddress={userAddress}
    >
      <VaultActionButtons activeTab={activeTab} onSelect={onTabChange} />
    </VaultSummaryPanel>
  );
}
