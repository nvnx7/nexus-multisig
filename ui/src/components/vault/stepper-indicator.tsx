import type { VaultStep } from "@/hooks/useVaultCreation";

const STEPS: { id: number; label: string; steps: VaultStep[] }[] = [
  { id: 1, label: "Configure", steps: ["configure"] },
  {
    id: 2,
    label: "Commit",
    steps: ["submitting_r1", "waiting_r1"],
  },
  {
    id: 3,
    label: "Share",
    steps: ["submitting_r2", "waiting_r2"],
  },
  {
    id: 4,
    label: "Finalize",
    steps: ["finalizing", "complete", "error"],
  },
];

function stepNumber(currentStep: VaultStep): number {
  for (const s of STEPS) {
    if (s.steps.includes(currentStep)) return s.id;
  }
  return 1;
}

export function StepperIndicator({ step }: { step: VaultStep }) {
  const current = stepNumber(step);

  return (
    <div className="flex items-start justify-center gap-0">
      {STEPS.map((s, idx) => {
        const done = s.id < current;
        const active = s.id === current;

        return (
          <div key={s.id} className="flex items-start">
            <div className="flex flex-col items-center gap-2 w-20">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  done
                    ? "bg-[#0d4732] text-white"
                    : active
                      ? "bg-[#0d4732] text-white ring-4 ring-[#0d4732]/20"
                      : "bg-[color:var(--surface-secondary)] text-[color:var(--muted)] border border-[color:var(--border)]",
                ].join(" ")}
              >
                {done ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.5 7L5.5 10L11.5 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  s.id
                )}
              </div>
              <span
                className={[
                  "font-sans text-xs text-center leading-tight",
                  active
                    ? "text-[color:var(--foreground)] font-medium"
                    : "text-[color:var(--muted)]",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={[
                  "h-0.5 w-12 mx-1 mt-4 transition-colors shrink-0",
                  done ? "bg-[#0d4732]" : "bg-[color:var(--border)]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
