#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"
CIRCUIT_PATH="$ROOT_DIR/circuits/main.circom"
R1CS_PATH="$BUILD_DIR/main.r1cs"
ZKEY_PATH="$BUILD_DIR/main.zkey"
VK_PATH="$BUILD_DIR/verification_key.json"
PTAU_PATH="${PTAU:-$ROOT_DIR/ptau16.ptau}"

mkdir -p "$BUILD_DIR"

echo "==> Compiling circuit..."
circom "$CIRCUIT_PATH" --r1cs --wasm --sym --output "$BUILD_DIR"

echo "==> Running Groth16 setup..."
snarkjs groth16 setup "$R1CS_PATH" "$PTAU_PATH" "$ZKEY_PATH"

echo "==> Exporting verification key..."
snarkjs zkey export verificationkey "$ZKEY_PATH" "$VK_PATH"

echo ""
echo "Generated artifacts:"
echo "  $R1CS_PATH"
echo "  $ZKEY_PATH"
echo "  $VK_PATH"
echo ""
echo "Run 'bun run stats' to inspect constraint count."
