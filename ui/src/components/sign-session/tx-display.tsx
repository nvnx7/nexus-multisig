import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { TxDetails } from "@/lib/tx/txDetails";
import { formatXLM } from "@/utils/token";

export function txAmount(d: TxDetails): string {
  if (d.type === "deposit") return formatXLM(BigInt(d.ext_data.ext_amount));
  if (d.type === "withdraw") return formatXLM(-BigInt(d.ext_data.ext_amount));
  return formatXLM(BigInt(d.output_notes[0]!.amount));
}

export function txRecipient(d: TxDetails, vaultAddress: string): string {
  if (d.type === "deposit") return vaultAddress;
  return d.ext_data.recipient;
}

export function txRecipientLabel(d: TxDetails): string {
  if (d.type === "deposit") return "To (vault)";
  if (d.type === "withdraw") return "To (Stellar)";
  return "To (shielded)";
}

export const TX_META: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  deposit: {
    icon: <ArrowDownLeft size={20} />,
    color: "green",
    label: "Deposit",
  },
  withdraw: {
    icon: <ArrowUpRight size={20} />,
    color: "red",
    label: "Withdraw",
  },
  transfer: {
    icon: <ArrowRight size={20} />,
    color: "blue",
    label: "Shielded Transfer",
  },
};
