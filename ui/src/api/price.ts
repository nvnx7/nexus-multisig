import { useQuery } from "@tanstack/react-query";

async function getXLMPrice(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd",
  );
  if (!res.ok) throw new Error("Failed to fetch XLM price");
  const data = await res.json();
  return data.stellar.usd as number;
}

export function useGetXLMPrice() {
  return useQuery({
    queryKey: ["xlm-price"],
    queryFn: getXLMPrice,
    staleTime: 60_000,
    retry: 2,
  });
}
