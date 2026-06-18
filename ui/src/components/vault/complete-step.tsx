"use client";

import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

interface CompleteStepProps {
  groupAddress: string;
  threshold: number;
  total: number;
}

export function CompleteStep({ groupAddress, threshold, total }: CompleteStepProps) {
  const router = useRouter();
  const shortAddr = `${groupAddress.slice(0, 18)}…${groupAddress.slice(-14)}`;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-[#0d4732]/10 flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 16.5L12 22.5L26 9"
            stroke="#0d4732"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="text-center flex flex-col gap-2">
        <h3 className="font-display text-xl font-semibold text-[color:var(--foreground)]">
          Vault created
        </h3>
        <p className="font-sans text-sm text-[color:var(--muted)] max-w-xs leading-relaxed">
          Your {threshold}-of-{total} multisig vault is ready. All participants
          can now co-sign transactions.
        </p>
      </div>

      {/* Vault details */}
      <div className="w-full flex flex-col gap-3 p-4 rounded-[var(--radius)] bg-[color:var(--surface-secondary)]">
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            Vault address
          </span>
          <span className="font-mono text-xs text-[color:var(--foreground)] break-all">
            {shortAddr}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            Policy
          </span>
          <span className="font-mono text-xs text-[color:var(--foreground)]">
            {threshold} of {total} signatures
          </span>
        </div>
      </div>

      {/* Actions */}
      <Button
        variant="primary"
        className="w-full font-sans font-medium"
        onPress={() => router.push("/")}
      >
        Back to Home
      </Button>
    </div>
  );
}
