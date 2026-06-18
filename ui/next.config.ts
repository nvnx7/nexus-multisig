import type { NextConfig } from "next";
import path from "node:path";

// __dirname = ui/
// root is one level up: stellar-multisig/ (the actual bun workspace root)
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
};

export default nextConfig;
