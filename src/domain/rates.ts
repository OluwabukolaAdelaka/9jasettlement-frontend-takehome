import Big from "big.js";
import { CURRENCIES, type Currency } from "./currency";

//Rate for each currency per 1 base unit.
export type RatesAgainstBase = Partial<Record<Currency, string>>;

export type RateDirection = "up" | "down" | "unchanged";

//Allows positive numbers with up to 8 decimal places.
const RATE_PATTERN = /^\d+(\.\d{1,8})?$/;

//Checks that the rate is valid and greater than zero.
export function isUsableRate(value: string | undefined): value is string {
  return value !== undefined && RATE_PATTERN.test(value) && new Big(value).gt(0);
}

export function rateDirection(previous: string | undefined, next: string): RateDirection {
  if (!isUsableRate(previous)) return "unchanged";
  const comparison = new Big(next).cmp(previous);
  if (comparison > 0) return "up";
  if (comparison < 0) return "down";
  return "unchanged";
}

export function rateDirections(
  previous: RatesAgainstBase | undefined,
  next: RatesAgainstBase,
): Partial<Record<Currency, RateDirection>> {
  const directions: Partial<Record<Currency, RateDirection>> = {};
  for (const currency of CURRENCIES) {
    const nextRate = next[currency];
    if (isUsableRate(nextRate)) directions[currency] = rateDirection(previous?.[currency], nextRate);
  }
  return directions;
}


const rateFormatters = new Map<string, Intl.NumberFormat>();

//Formats rates for display with 2–8 decimal places.
export function formatRate(rate: string, locale?: string): string {
  const key = locale ?? "";
  let formatter = rateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
    rateFormatters.set(key, formatter);
  }
  return formatter.format(rate as `${number}`);
}

//Uses the previous rate when the new rate is missing or invalid.
export function mergeWithLastGood(
  previous: RatesAgainstBase | undefined,
  next: RatesAgainstBase,
): RatesAgainstBase {
  const merged: RatesAgainstBase = {};
  for (const currency of CURRENCIES) {
    const nextRate = next[currency];
    const previousRate = previous?.[currency];
    if (isUsableRate(nextRate)) merged[currency] = nextRate;
    else if (isUsableRate(previousRate)) merged[currency] = previousRate;
  }
  return merged;
}
