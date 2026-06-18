"use client";

import { useState, useRef } from "react";
import {
  Button,
  Chip,
  NumberField,
  Separator,
  Spinner,
  TextField,
  Input,
  Label,
} from "@heroui/react";
import { getPoolPublicKey } from "@/api/pool/getPoolPublicKey";

export interface MemberEntry {
  /** Stellar G… address (the user-facing identifier). */
  stellarAddress: string;
  /** BabyJubJub note-key X from pool.register() — used for DKG ECDH. */
  noteKeyX?: string;
  /** BabyJubJub note-key Y from pool.register() — used for DKG ECDH. */
  noteKeyY?: string;
  /** X25519 view-key from pool.register() — used for note encryption. */
  encKey?: string;
  valid: boolean;
  isSelf: boolean;
}

interface ConfigureStepProps {
  /** Stellar G… address of the connected wallet. */
  selfStellarAddress: string;
  onStart: (memberStellarAddresses: string[], threshold: number) => void;
  isStarting: boolean;
}

export function ConfigureStep({
  selfStellarAddress,
  onStart,
  isStarting,
}: ConfigureStepProps) {
  const [members, setMembers] = useState<MemberEntry[]>([
    { stellarAddress: selfStellarAddress, valid: true, isSelf: true },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [inputChecking, setInputChecking] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(2);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMember = async () => {
    const addr = inputValue.trim();
    if (!addr) return;

    if (members.some((m) => m.stellarAddress === addr)) {
      setInputError("Already added");
      return;
    }

    setInputChecking(true);
    setInputError(null);

    try {
      // Look up shielded keys from pool contract PublicKeyEvent events
      const pubkey = await getPoolPublicKey(addr);
      if (!pubkey) {
        setInputError("Address not registered on pool");
        setMembers((prev) => [
          ...prev,
          { stellarAddress: addr, valid: false, isSelf: false },
        ]);
      } else {
        setMembers((prev) => [
          ...prev,
          {
            stellarAddress: addr,
            noteKeyX: pubkey.note_key_x,
            noteKeyY: pubkey.note_key_y,
            encKey: pubkey.enc_key,
            valid: true,
            isSelf: false,
          },
        ]);
        setInputValue("");
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } catch {
      setInputError("Failed to look up address");
    } finally {
      setInputChecking(false);
    }
  };

  const removeMember = (addr: string) => {
    setMembers((prev) =>
      prev.filter((m) => m.stellarAddress !== addr || m.isSelf),
    );
    if (threshold > members.length - 1) {
      setThreshold(Math.max(1, members.length - 1));
    }
  };

  const validMembers = members.filter((m) => m.valid);
  const canStart =
    validMembers.length >= 2 &&
    !isStarting &&
    threshold >= 1 &&
    threshold <= validMembers.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Members section */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[color:var(--foreground)]">
            Participants
          </h3>
          <p className="font-sans text-xs text-[color:var(--muted)] mt-0.5">
            Add co-signers by their Stellar address. At least 2 required.
          </p>
        </div>

        {/* Add member input */}
        <div className="flex gap-2">
          <TextField
            className="flex-1"
            value={inputValue}
            onChange={setInputValue}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter") addMember();
            }}
            isInvalid={!!inputError}
          >
            <Input
              ref={inputRef}
              placeholder="Stellar address (G…)"
              className="font-mono text-xs"
            />
          </TextField>
          <Button
            variant="outline"
            size="sm"
            onPress={addMember}
            isDisabled={inputChecking || !inputValue.trim()}
            className="font-sans shrink-0"
          >
            {inputChecking ? <Spinner size="sm" color="current" /> : "Add"}
          </Button>
        </div>

        {inputError && (
          <p className="font-sans text-xs text-[color:var(--danger)] -mt-2">
            {inputError}
          </p>
        )}

        {/* Member list */}
        <div className="flex flex-col gap-1.5">
          {members.map((m) => (
            <div
              key={m.stellarAddress}
              className="flex items-center gap-3 py-2.5 px-3 rounded-[var(--radius)] bg-[color:var(--surface-secondary)]"
            >
              <span className="font-mono text-xs text-[color:var(--foreground)] truncate flex-1 min-w-0">
                {m.stellarAddress}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {m.isSelf && (
                  <Chip size="sm" variant="soft">
                    <Chip.Label>You</Chip.Label>
                  </Chip>
                )}
                {!m.isSelf && !m.valid && (
                  <Chip size="sm" color="danger" variant="soft">
                    <Chip.Label>Not registered</Chip.Label>
                  </Chip>
                )}
                {!m.isSelf && (
                  <button
                    type="button"
                    onClick={() => removeMember(m.stellarAddress)}
                    className="text-[color:var(--muted)] hover:text-[color:var(--danger)] transition-colors text-base leading-none"
                    aria-label="Remove member"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Threshold section */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[color:var(--foreground)]">
            Signing threshold
          </h3>
          <p className="font-sans text-xs text-[color:var(--muted)] mt-0.5">
            Minimum signatures required to authorize a transaction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-sans text-sm text-[color:var(--muted)] shrink-0">
            Require
          </span>
          <NumberField
            value={threshold}
            onChange={setThreshold}
            minValue={1}
            maxValue={validMembers.length || 1}
            className="w-28"
          >
            <Label className="sr-only">Threshold</Label>
            <NumberField.Group>
              <NumberField.DecrementButton className="px-2 py-1 font-mono">
                −
              </NumberField.DecrementButton>
              <NumberField.Input className="text-center font-mono text-sm w-10" />
              <NumberField.IncrementButton className="px-2 py-1 font-mono">
                +
              </NumberField.IncrementButton>
            </NumberField.Group>
          </NumberField>
          <span className="font-sans text-sm text-[color:var(--muted)]">
            of {validMembers.length} signer{validMembers.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <Button
        variant="primary"
        isDisabled={!canStart}
        onPress={() =>
          onStart(
            validMembers.map((m) => m.stellarAddress),
            threshold,
          )
        }
        className="font-sans font-medium gap-2 mt-2"
      >
        {isStarting ? <Spinner size="sm" color="current" /> : null}
        {isStarting ? "Starting…" : "Create Vault"}
      </Button>
    </div>
  );
}
