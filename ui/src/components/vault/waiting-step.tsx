import { Spinner } from "@heroui/react";
import type { DkgSessionDetail } from "@/api/dkg/getSession";
import type { VaultStep } from "@/hooks/useVaultCreation";

function CopyButton({ text }: { text: string }) {
  const copy = () => navigator.clipboard.writeText(text).catch(() => {});
  return (
    <button
      type="button"
      onClick={copy}
      className="font-mono text-xs px-2 py-0.5 rounded border border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--foreground)] hover:border-[color:var(--field-border-focus)] transition-colors"
    >
      Copy
    </button>
  );
}

interface WaitingStepProps {
  step: VaultStep;
  sessionData: DkgSessionDetail | null;
  sessionId: string | null;
}

export function WaitingStep({ step, sessionData, sessionId }: WaitingStepProps) {
  const isRound1 = step === "submitting_r1" || step === "waiting_r1";
  const isFinalizing = step === "finalizing";

  const count = isRound1
    ? (sessionData?.round1_count ?? 0)
    : (sessionData?.round2_count ?? 0);
  const total = sessionData?.total ?? 0;
  const progressPct = total > 0 ? Math.round((count / total) * 100) : 0;

  const title = isFinalizing
    ? "Finalizing vault…"
    : isRound1
      ? "Waiting for participants to commit"
      : "Exchanging encrypted shares";

  const subtitle = isFinalizing
    ? "Verifying shares and deriving the group key."
    : isRound1
      ? "Share the session ID with co-signers. Each must open this page and join."
      : "All participants have committed. Submitting encrypted key shares.";

  return (
    <div className="flex flex-col gap-6">
      {/* Spinner + status */}
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Spinner size="lg" color="current" className="text-[#0d4732]" />
        <div>
          <p className="font-display text-base font-semibold text-[color:var(--foreground)]">
            {title}
          </p>
          <p className="font-sans text-xs text-[color:var(--muted)] mt-1 max-w-sm leading-relaxed mx-auto">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Session ID */}
      {sessionId && !isFinalizing && (
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            Session ID
          </span>
          <div className="flex items-center gap-2 py-2 px-3 rounded-[var(--radius)] bg-[color:var(--surface-secondary)]">
            <span className="font-mono text-xs text-[color:var(--foreground)] flex-1 truncate">
              {sessionId}
            </span>
            <CopyButton text={sessionId} />
          </div>
        </div>
      )}

      {/* Progress */}
      {!isFinalizing && total > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-sans text-xs text-[color:var(--muted)]">
              {isRound1 ? "Commitments received" : "Shares submitted"}
            </span>
            <span className="font-sans text-xs font-medium text-[color:var(--foreground)]">
              {count} / {total}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[color:var(--border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0d4732] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Participant list */}
      {sessionData && !isFinalizing && sessionData.participants.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
            Participants ({sessionData.participants.length})
          </span>
          {sessionData.participants.map((p) => (
            <div
              key={p.address}
              className="flex items-center gap-3 py-2 px-3 rounded-[var(--radius)] bg-[color:var(--surface-secondary)]"
            >
              <span className="font-mono text-[10px] text-[color:var(--muted)] w-4 shrink-0">
                {p.participant_index}
              </span>
              <span className="font-mono text-xs text-[color:var(--foreground)] truncate flex-1">
                {p.address.slice(0, 16)}…{p.address.slice(-12)}
              </span>
              <Spinner size="sm" color="current" className="text-[color:var(--muted)] shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
