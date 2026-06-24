"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { system } from "@/theme";
import { WalletProvider } from "@/context/wallet-context";

export function Providers({ children }: { children: React.ReactNode }) {
  // Lazily create a single QueryClient per browser session. Using useState (not
  // a module-level singleton) keeps it from leaking across requests on the
  // server and from being recreated on re-render.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
          <WalletProvider>{children}</WalletProvider>
        </ThemeProvider>
      </ChakraProvider>
    </QueryClientProvider>
  );
}
