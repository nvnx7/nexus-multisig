"use client";

import { Card, Chip } from "@heroui/react";

export interface MultisigGroup {
  id: string;
  threshold: number;
  total: number;
  agg_address: string;
  status: string;
  created_at: number;
}

export function MultisigCard({ group }: { group: MultisigGroup }) {
  const short = `${group.agg_address.slice(0, 10)}…${group.agg_address.slice(-8)}`;
  const isActive = group.status === "active";

  return (
    <Card
      variant="default"
      className="cursor-pointer hover:bg-[color:var(--surface-secondary)] transition-colors"
    >
      <Card.Content className="flex flex-row items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-mono text-xs text-[color:var(--foreground)] truncate">{short}</span>
          <span className="font-sans text-xs text-[color:var(--muted)]">
            {group.threshold} of {group.total} · requires {group.threshold} signatures
          </span>
        </div>
        <Chip color={isActive ? "success" : "warning"} variant="soft" size="sm">
          <Chip.Label className="font-mono text-[10px] tracking-wide">
            {group.status}
          </Chip.Label>
        </Chip>
      </Card.Content>
    </Card>
  );
}
