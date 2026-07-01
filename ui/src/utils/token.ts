import { STROOPS_PER_XLM } from "@/config/constants";

/**
 * Convert a bigint amount in stroops (base units) to a human-readable XLM
 * string, e.g. `1_000_000n` → `"0.1"`.
 *
 * @param stroops - Amount in stroops.
 * @param decimals - Number of decimal places to include (default: 2).
 */
export function formatXLM(stroops: bigint, decimals = 2): string {
  const divisor = STROOPS_PER_XLM;
  const whole = stroops / divisor;
  const remainder = stroops % divisor;

  if (decimals === 0) return whole.toString();

  // Pad remainder to 7 digits, then trim to requested precision.
  const fracStr = remainder.toString().padStart(7, "0").slice(0, decimals);
  return `${whole}.${fracStr}`;
}

/**
 * Parse a human-readable XLM amount string into stroops (bigint base units),
 * e.g. `"0.1"` → `1_000_000n`.
 *
 * Throws if the value is not a valid non-negative decimal number.
 */
export function parseXLM(xlm: string): bigint {
  const trimmed = xlm.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid XLM amount: "${xlm}"`);
  }

  const [wholePart, fracPart = ""] = trimmed.split(".");
  // Pad / truncate fractional part to exactly 7 digits.
  const frac = fracPart.slice(0, 7).padEnd(7, "0");

  return BigInt(wholePart) * STROOPS_PER_XLM + BigInt(frac);
}
