#!/usr/bin/env bun
/**
 * Generate the pool contract's TypeScript bindings from its compiled wasm into
 * the top-level `bindings` package, then install deps and build it. Run this
 * whenever the pool contract's interface changes.
 *
 * Generates from the wasm (not a deployed contract id), so it works offline and
 * doesn't need a running network. The generated package has no `networks`
 * constant — the frontend supplies the contract id from ui/src/config/constants.ts.
 *
 * Usage:
 *   bun contracts/scripts/bindings.ts
 *   (or: cd contracts && bun run bindings)
 */

import { $ } from "bun";
import { join } from "node:path";

// ── Config ────────────────────────────────────────────────────────────────────
const SCRIPT_DIR = import.meta.dir; // contracts/scripts
const CONTRACTS_DIR = join(SCRIPT_DIR, ".."); // contracts
const REPO_ROOT = join(CONTRACTS_DIR, ".."); // repo root
const MANIFEST_PATH = join(CONTRACTS_DIR, "Cargo.toml");
const WASM_DIR = join(CONTRACTS_DIR, "target", "stellar");
const POOL_WASM = join(WASM_DIR, "pool.wasm");
/** Output package. Generated package name = this directory's basename → "bindings". */
const OUTPUT_DIR = join(REPO_ROOT, "bindings");

// 1. Build the pool wasm so the bindings reflect the current contract interface.
console.log("Building pool wasm…");
await $`stellar contract build --manifest-path ${MANIFEST_PATH} --out-dir ${WASM_DIR} --package pool`.quiet();

// 2. Generate the TypeScript bindings from the wasm.
console.log(`Generating bindings → ${OUTPUT_DIR}`);
await $`stellar contract bindings typescript --wasm ${POOL_WASM} --output-dir ${OUTPUT_DIR} --overwrite`;

// 3. Install workspace deps and build the generated package to dist/.
console.log("Installing dependencies…");
await $`bun install`.cwd(REPO_ROOT);
console.log("Building bindings package…");
await $`bun run build`.cwd(OUTPUT_DIR);

console.log("\n✅ Bindings generated and built (bindings/dist).");
