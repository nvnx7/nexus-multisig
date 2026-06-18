"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@heroui/react";
import { useWallet, WalletProvider } from "@/context/wallet-context";
import { useVaultCreation } from "@/hooks/useVaultCreation";
import { StepperIndicator } from "@/components/vault/stepper-indicator";
import { ConfigureStep } from "@/components/vault/configure-step";
import { WaitingStep } from "@/components/vault/waiting-step";
import { CompleteStep } from "@/components/vault/complete-step";

function NewVaultContent() {
  const router = useRouter();
  const { stellarAddress, shielded, isHydrated } = useWallet();
  const { state, start, reset } = useVaultCreation();

  // Only redirect after localStorage has been restored — avoids false redirect
  // on the initial render when shielded is still null.
  useEffect(() => {
    if (isHydrated && !shielded) router.replace("/");
  }, [isHydrated, shielded, router]);

  if (!isHydrated || !shielded || !stellarAddress) return null;

  const { step, sessionId, sessionData, groupId, groupAddress, error } = state;

  const isWaiting =
    step === "submitting_r1" ||
    step === "waiting_r1" ||
    step === "submitting_r2" ||
    step === "waiting_r2" ||
    step === "finalizing";

  return (
    <main className="min-h-screen bg-[color:var(--background)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[color:var(--separator)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-sans text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)] transition-colors"
            disabled={isWaiting}
          >
            ← Back
          </button>
          <span className="text-[color:var(--border)]">/</span>
          <span className="font-display text-sm font-medium text-[color:var(--foreground)]">
            New Vault
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-col items-center flex-1 px-6 py-10">
        <div className="w-full max-w-lg flex flex-col gap-10">
          {/* Stepper */}
          <StepperIndicator step={step} />

          {/* Card */}
          <div className="bg-[color:var(--surface)] rounded-[var(--radius)] border border-[color:var(--border)] p-8 shadow-[var(--surface-shadow)]">
            {step === "configure" && (
              <ConfigureStep
                selfStellarAddress={stellarAddress}
                onStart={(members, threshold) =>
                  start(stellarAddress, shielded, members, threshold)
                }
                isStarting={false}
              />
            )}

            {isWaiting && (
              <WaitingStep
                step={step}
                sessionData={sessionData}
                sessionId={sessionId}
              />
            )}

            {step === "complete" && groupAddress && sessionData && (
              <CompleteStep
                groupAddress={groupAddress}
                threshold={sessionData.threshold}
                total={sessionData.total}
              />
            )}

            {step === "error" && (
              <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[color:var(--danger)]/10 flex items-center justify-center">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M14 8V15M14 20H14.01"
                      stroke="var(--danger)"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="14" cy="14" r="12" stroke="var(--danger)" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-[color:var(--foreground)]">
                    Something went wrong
                  </p>
                  <p className="font-sans text-xs text-[color:var(--muted)] mt-1 max-w-xs leading-relaxed">
                    {error}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onPress={reset}
                  className="font-sans text-sm"
                >
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function NewVaultPage() {
  return (
    <WalletProvider>
      <NewVaultContent />
    </WalletProvider>
  );
}
