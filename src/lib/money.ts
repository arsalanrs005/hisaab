/**
 * Decimal-safe money helpers for PKR amounts.
 * Supabase numeric columns arrive as strings — keep them as strings until display.
 */

const MONEY_SCALE = 2;

function toMinorUnits(value: string | number): bigint {
  const normalized = String(value).trim().replace(/,/g, "");
  if (!normalized || normalized === "-") return 0n;
  const negative = normalized.startsWith("-");
  const abs = negative ? normalized.slice(1) : normalized;
  const [whole = "0", frac = ""] = abs.split(".");
  const paddedFrac = frac.padEnd(MONEY_SCALE, "0").slice(0, MONEY_SCALE);
  const minor = BigInt(whole || "0") * 100n + BigInt(paddedFrac || "0");
  return negative ? -minor : minor;
}

function fromMinorUnits(minor: bigint): number {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const frac = abs % 100n;
  const value = Number(whole) + Number(frac) / 100;
  return negative ? -value : value;
}

export function parseMoney(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  return fromMinorUnits(toMinorUnits(value));
}

export function multiplyMoney(amount: string | number, rate: string | number): number {
  const amountMinor = toMinorUnits(amount);
  const rateParts = String(rate).split(".");
  const rateWhole = BigInt(rateParts[0] || "0");
  const rateFrac = (rateParts[1] ?? "").padEnd(6, "0").slice(0, 6);
  const rateScaled = rateWhole * 1_000_000n + BigInt(rateFrac);
  const product = (amountMinor * rateScaled) / 1_000_000n;
  return fromMinorUnits(product);
}

export function sumMoney(values: Array<string | number | null | undefined>): number {
  const total = values.reduce<bigint>((acc, v) => acc + toMinorUnits(v ?? 0), 0n);
  return fromMinorUnits(total);
}

export function roundMoney(value: number): number {
  return fromMinorUnits(toMinorUnits(value));
}

export function formatMoneyInput(value: number): string {
  return roundMoney(value).toFixed(MONEY_SCALE);
}

/** Numeric value for Supabase `numeric` columns in typed inserts. */
export function toDbMoney(value: string | number): number {
  if (typeof value === "number") return roundMoney(value);
  return parseMoney(value);
}

export function isPositiveMoney(value: string | number): boolean {
  return toMinorUnits(value) > 0n;
}
