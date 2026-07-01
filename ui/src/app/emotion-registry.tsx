"use client";

import { useState } from "react";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";

/**
 * Emotion SSR registry for the Next.js App Router.
 *
 * Without this, Emotion (which Chakra UI v3 uses under the hood) renders its
 * `<Global>` reset styles as an inline `<style>` element in the body during
 * SSR, but injects them into `<head>` — rendering nothing inline — on the
 * client. That difference in sibling count/order makes React hydration fail.
 *
 * Here we give Emotion a cache in `compat` mode and flush everything it has
 * inserted into `<head>` via `useServerInsertedHTML`, so the server- and
 * client-rendered trees match. Components must consume this cache through
 * `CacheProvider`, so it wraps `ChakraProvider`.
 */
export function EmotionRegistry({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const c = createCache({ key: "css" });
    c.compat = true;
    return c;
  });

  useServerInsertedHTML(() => {
    const names = Object.keys(cache.inserted);
    if (names.length === 0) return null;
    return (
      <style
        data-emotion={`${cache.key} ${names.join(" ")}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: names.map((name) => cache.inserted[name]).join(""),
        }}
      />
    );
  });

  return <CacheProvider value={cache}>{children}</CacheProvider>;
}
