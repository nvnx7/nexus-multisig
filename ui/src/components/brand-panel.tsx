function StellarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <line x1="16" y1="2" x2="16" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5.5" y1="5.5" x2="26.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="26.5" y1="5.5" x2="5.5" y2="26.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[10px] tracking-widest uppercase text-[#7eb59a]">{label}</span>
      <span className="font-mono text-xs font-medium text-white">{value}</span>
    </div>
  );
}

export function BrandPanel() {
  return (
    <section className="flex flex-col justify-center items-center w-1/2 h-full bg-[#002f1f] px-16 gap-10 shrink-0">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-14 h-14 text-[#9bd3b6]">
          <StellarMark className="w-full h-full" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-white">
            Nexus
          </h1>
          <p className="font-sans text-sm leading-relaxed text-[#7eb59a] max-w-[22rem]">
            Institutional-grade threshold signature wallets. Private by design,
            cryptographically verifiable, fully non-custodial.
          </p>
        </div>
      </div>

      <div className="flex gap-8 border-t border-[#19503a] pt-8">
        <StatPill label="Signature scheme" value="FROST" />
        <StatPill label="Privacy layer" value="ZK Proofs" />
        <StatPill label="Curve" value="BabyJubJub" />
      </div>
    </section>
  );
}
