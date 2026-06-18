"use client";

import { useWallet } from "@/context/wallet-context";
import { Button, Separator, Spinner } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MultisigCard, type MultisigGroup } from "./multisig-card";

// ── Sub-components ─────────────────────────────────────────────────────────

function AddressRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-[10px] uppercase tracking-widest text-[color:var(--muted)]">
        {label}
      </span>
      <span className="font-mono text-xs text-[color:var(--foreground)] break-all">
        {value}
      </span>
    </div>
  );
}

function ConnectedHeader({
  stellarAddress,
  shieldedAddress,
  onDisconnect,
}: {
  stellarAddress: string;
  shieldedAddress: string;
  onDisconnect: () => void;
}) {
  const shortStellar = `${stellarAddress.slice(0, 8)}…${stellarAddress.slice(-6)}`;
  const shortShielded = `${shieldedAddress.slice(0, 14)}…${shieldedAddress.slice(-10)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3 min-w-0 flex-1">
          <AddressRow label="Stellar Wallet" value={shortStellar} />
          <AddressRow label="Shielded Identity" value={shortShielded} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onPress={onDisconnect}
          className="font-sans text-xs text-[color:var(--muted)] shrink-0"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function EmptyVaults() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center py-16">
      <span
        className="font-mono text-4xl text-[color:var(--border)] select-none"
        aria-hidden="true"
      >
        ✦
      </span>
      <p className="font-sans text-sm text-[color:var(--muted)]">No vaults yet</p>
      <p className="font-sans text-xs text-[color:var(--muted)] max-w-[22rem] leading-relaxed">
        Create a new vault or ask a group member to add your shielded address to
        an existing one.
      </p>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function WalletPanel() {
  const router = useRouter();
  const { stellarAddress, shielded, connectPhase, connectError, connect, disconnect } =
    useWallet();
  const isConnecting = connectPhase !== "idle" && connectPhase !== "done";

  const [groups, setGroups] = useState<MultisigGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (!shielded?.address) {
      setGroups([]);
      return;
    }
    setLoadingGroups(true);
    fetch(`/api/groups?member_address=${shielded.address}`)
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, [shielded?.address]);

  // ── Disconnected ────────────────────────────────────────────────────────

  if (!stellarAddress || !shielded) {
    return (
      <section className="flex flex-col items-center justify-center w-1/2 h-full bg-[color:var(--surface)] px-16 gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-display text-2xl font-semibold text-[color:var(--foreground)]">
            Welcome back
          </h2>
          <p className="font-sans text-sm text-[color:var(--muted)] max-w-xs leading-relaxed">
            Connect your Stellar wallet. You&apos;ll sign one message to derive
            your private shielded identity.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          isDisabled={isConnecting}
          onPress={connect}
          className="font-sans font-medium px-10 gap-2"
        >
          {isConnecting ? <Spinner size="sm" color="current" /> : null}
          {connectPhase === "signing" ? "Sign to derive keys…"
            : connectPhase === "registering" ? "Registering on-chain…"
            : isConnecting ? "Connecting…"
            : "Connect Wallet"}
        </Button>

        {connectError && (
          <p className="font-sans text-xs text-[color:var(--danger)] max-w-xs text-center leading-relaxed">
            {connectError}
          </p>
        )}
      </section>
    );
  }

  // ── Connected ───────────────────────────────────────────────────────────

  return (
    <section className="flex flex-col w-1/2 h-full bg-[color:var(--surface)] px-12 py-10 gap-6">
      <ConnectedHeader
        stellarAddress={stellarAddress}
        shieldedAddress={shielded.address}
        onDisconnect={disconnect}
      />

      <Separator />

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-[color:var(--foreground)]">
          My Vaults
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="font-sans text-sm"
          onPress={() => router.push("/vault/new")}
        >
          + New Vault
        </Button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-2">
        {loadingGroups ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner size="sm" />
          </div>
        ) : groups.length === 0 ? (
          <EmptyVaults />
        ) : (
          groups.map((g) => <MultisigCard key={g.id} group={g} />)
        )}
      </div>
    </section>
  );
}
