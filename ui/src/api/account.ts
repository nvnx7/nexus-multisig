import { useQuery } from "@tanstack/react-query";
import { horizonUrl } from "@/config/env";

async function fetchNativeBalance(address: string): Promise<string> {
  const res = await fetch(`${horizonUrl}/accounts/${address}`);
  if (!res.ok) throw new Error("Failed to fetch account");
  const data = await res.json();
  const native = (data.balances as { asset_type: string; balance: string }[])
    .find((b) => b.asset_type === "native");
  return native ? parseFloat(native.balance).toFixed(2) : "0.00";
}

export function useNativeBalance(address: string | null) {
  return useQuery({
    queryKey: ["native-balance", address],
    queryFn: () => fetchNativeBalance(address!),
    enabled: !!address,
    staleTime: 30_000,
    retry: 2,
  });
}
