import Big from "big.js";
import { type Currency, MINOR_DIGITS } from "./currency";

//Store money as BigInt in the smallest currency unit, like kobo or cents.
//Convert it to a string only when sending it to the API.
//Never use JavaScript floating-point numbers for money.

const INTEGER_STRING = /^-?\d+$/;
const DECIMAL_INPUT = /^\d+(\.\d*)?$|^\.\d+$/;

function minorScale(currency: Currency): Big {
  return new Big(10).pow(MINOR_DIGITS[currency]);
}

export function parseMinor(value: string): bigint {
  if (!INTEGER_STRING.test(value)) {
    throw new Error(`Invalid minor-unit amount: "${value}"`);
  }
  return BigInt(value);
}

export function minorToMajorString(minor: bigint, currency: Currency): string {
  return new Big(minor.toString()).div(minorScale(currency)).toFixed(MINOR_DIGITS[currency]);
}

export type ParseAmountResult =
  | { ok: true; minor: bigint }
  | { ok: false; reason: "empty" | "invalid" | "too_many_decimals" };

//Converts user input like "2500.75" into minor units. Rejects commas and extra decimal places.
export function parseUserAmount(input: string, currency: Currency): ParseAmountResult {
  const trimmed = input.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };
  if (!DECIMAL_INPUT.test(trimmed)) return { ok: false, reason: "invalid" };

  const decimals = trimmed.split(".")[1]?.length ?? 0;
  if (decimals > MINOR_DIGITS[currency]) return { ok: false, reason: "too_many_decimals" };

  const minor = new Big(trimmed).times(minorScale(currency));
  return { ok: true, minor: BigInt(minor.toFixed(0)) };
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: Currency, locale: string | undefined): Intl.NumberFormat {
  const key = `${locale ?? ""}|${currency}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    const digits = MINOR_DIGITS[currency];
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      //Without this, en-US/en-GB show "NGN 1,250.00" instead of "₦1,250.00".
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

//Passed to Intl as a decimal string, so large balances never pass through a float.
export function formatMoney(minor: bigint, currency: Currency, locale?: string): string {
  const major = minorToMajorString(minor, currency) as `${number}`;
  return currencyFormatter(currency, locale).format(major);
}
