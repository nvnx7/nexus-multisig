"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { system } from "@/theme";
import { WalletProvider } from "@/context/wallet-context";
import { EmotionRegistry } from "./emotion-registry";

export function Providers({ children }: { children: React.ReactNode }) {
  // Lazily create a single QueryClient per browser session. Using useState (not
  // a module-level singleton) keeps it from leaking across requests on the
  // server and from being recreated on re-render.
  const [queryClient] = useState(() => new QueryClient());

  // The app is light-only. Chakra's `_dark` styles are gated on a `.dark`
  // class, so with no color-mode provider toggling that class everything
  // resolves to light. We deliberately omit next-themes' ThemeProvider: its
  // injected <script> renders in a different sibling order than Emotion's
  // SSR-only global <style> (Emotion renders the style inline on the server but
  // injects via the DOM — rendering null — on the client), which produced a
  // hydration mismatch under the provider.
  return (
    <QueryClientProvider client={queryClient}>
      <EmotionRegistry>
        <ChakraProvider value={system}>
          <WalletProvider>{children}</WalletProvider>
        </ChakraProvider>
      </EmotionRegistry>
    </QueryClientProvider>
  );
}
