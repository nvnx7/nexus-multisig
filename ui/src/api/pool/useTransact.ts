"use client";

/**
 * Hook to perform a shielded pool transaction.
 *
 * Generates the Groth16 proof and assembles the `pool.transact()` call
 * (`buildTransactTx`), then signs it with the connected wallet, submits it, and
 * waits for confirmation. The caller supplies a ready-built witness
 * (`TransactInput`) and the external data (`ExtData`).
 */

import { useCallback, useState } from "react";
import { buildTransactTx, type TransactInput, type ExtData } from "./transact";
import { signAndSubmit } from "@/api/rpc";

export type TransactStatus =
  | "idle"
  | "proving"
  | "signing"
  | "success"
  | "error";

export function useTransact() {
  const [status, setStatus] = useState<TransactStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const transact = useCallback(
    async (
      senderAddress: string,
      input: TransactInput,
      extData: ExtData,
    ): Promise<string> => {
      setError(null);
      setTxHash(null);
      try {
        // 1. Generate the proof and assemble the unsigned transaction.
        setStatus("proving");
        const unsignedXdr = await buildTransactTx(senderAddress, input, extData);

        // 2. Sign with the wallet, submit, and await confirmation.
        setStatus("signing");
        const hash = await signAndSubmit(unsignedXdr, senderAddress);

        setTxHash(hash);
        setStatus("success");
        return hash;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Transaction failed");
        setStatus("error");
        throw err;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return {
    transact,
    reset,
    status,
    error,
    txHash,
    isPending: status === "proving" || status === "signing",
  };
}
