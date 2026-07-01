"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { buildTransactTx, type TransactInput, type ExtData } from "./transact";
import { signAndSubmit } from "@/api/rpc";

export type TransactStatus =
  | "idle"
  | "proving"
  | "signing"
  | "success"
  | "error";

export function useTransact() {
  const [phase, setPhase] = useState<"proving" | "signing" | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      senderAddress,
      input,
      extData,
    }: {
      senderAddress: string;
      input: TransactInput;
      extData: ExtData;
    }) => {
      setPhase("proving");
      const tx = await buildTransactTx(senderAddress, input, extData);
      // setPhase("signing");
      // const hash = await signAndSubmit(tx, senderAddress);
      const hash = await tx.signAndSend();
      console.log("transact hash", hash);
      return "";
    },
    onSettled: () => setPhase(null),
  });

  const status: TransactStatus = mutation.isPending
    ? (phase ?? "proving")
    : mutation.isSuccess
      ? "success"
      : mutation.isError
        ? "error"
        : "idle";

  return {
    transact: (senderAddress: string, input: TransactInput, extData: ExtData) =>
      mutation.mutateAsync({ senderAddress, input, extData }),
    reset: mutation.reset,
    status,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    txHash: mutation.data ?? null,
    isPending: mutation.isPending,
  };
}
