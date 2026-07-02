import axios from "axios";
import { networkConfig } from "@/config/network";
import { useQuery } from "@tanstack/react-query";

async function fetchNativeBalance(address: string): Promise<string> {
  const { horizonUrl } = networkConfig;
  const { data } = await axios.get<{ balances: { asset_type: string; balance: string }[] }>(
    `${horizonUrl}/accounts/${address}`,
  );
  const native = data.balances.find((b) => b.asset_type === "native");
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
