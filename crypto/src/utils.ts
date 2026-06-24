export function mod(a: bigint, n: bigint): bigint {
    const res = a % n;
    return res < 0n ? res + n : res;
}
