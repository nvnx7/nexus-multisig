"use client";

import { useMutation } from "@tanstack/react-query";
import coordinatorClient from "@/api/coordinator";

export type CreateDkgSessionResult = {
  id: string;
  participants: { address: string }[];
};

export async function createDkgSession(
  threshold: number,
  participants: string[],
): Promise<CreateDkgSessionResult> {
  const { data } = await coordinatorClient.post<CreateDkgSessionResult>("dkg", {
    threshold,
    participants,
  });
  return data;
}

export function useCreateDkgSession() {
  return useMutation({
    mutationFn: ({
      threshold,
      participants,
    }: {
      threshold: number;
      participants: string[];
    }) => createDkgSession(threshold, participants),
  });
}
