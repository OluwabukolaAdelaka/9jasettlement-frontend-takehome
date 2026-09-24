import Big from "big.js";
import { CURRENCIES, type Currency } from "@/domain/currency";
import { RATE_DECIMALS } from "@/domain/pricing";
import type { RatesAgainstBase } from "@/domain/rates";
import type { RatesResponse } from "@/lib/api/types";

export const MAX_DRIFT = new Big("0.005");

//Adds a random ±0.5% drift and updates the same record.
export function driftRates(
  usdRates: Record<Currency, Big>,
  random: () => number = Math.random,
): Record<Currency, Big> {
  for (const currency of CURRENCIES) {
    if (currency === "USD") continue;
    const factor = new Big(1).plus(new Big(random()).times(2).minus(1).times(MAX_DRIFT));
    usdRates[currency] = usdRates[currency].times(factor).round(RATE_DECIMALS, Big.roundHalfEven);
  }
  return usdRates;
}

//Converts USD rates to the selected base currency.
export function ratesAgainst(usdRates: Record<Currency, Big>, base: Currency): RatesAgainstBase {
  const rates: RatesAgainstBase = {};
  for (const currency of CURRENCIES) {
    if (currency === base) continue;
    rates[currency] = usdRates[currency].div(usdRates[base]).toFixed(RATE_DECIMALS);
  }
  return rates;
}

export function ratesResponse(usdRates: Record<Currency, Big>, base: Currency, now: Date): RatesResponse {
  return { base, rates: ratesAgainst(usdRates, base), timestamp: now.toISOString() };
}
