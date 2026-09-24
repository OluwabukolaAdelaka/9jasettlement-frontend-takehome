import Big from "big.js";
import { CURRENCIES, type Currency } from "@/domain/currency";
import type { BalancesResponse, RatesResponse } from "./types";

//Temporary sample payloads, copied from the brief and used until the mock API routes exist.

export const SAMPLE_BALANCES: BalancesResponse = {
  balances: [
    { currency: "NGN", amount: "125000050" },
    { currency: "USD", amount: "250075" },
    { currency: "GBP", amount: "0" },
    { currency: "EUR", amount: "48020" },
    { currency: "JPY", amount: "150000" },
  ],
};

export const SAMPLE_RATES_USD: RatesResponse = {
  base: "USD",
  rates: { NGN: "1532.45120000", GBP: "0.74210000", EUR: "0.85430000", JPY: "147.82000000" },
  timestamp: "2026-09-24T10:15:05.000Z",
};

//TEMPORARY: random ±0.5% drift so the rate arrows can be checked before the mock API exists.
function drift(rate: Big): Big {
  const factor = new Big(1).plus(new Big(Math.random()).minus(0.5).times(0.01));
  return rate.times(factor);
}

//Re-bases the USD sample rates onto any currency, e.g. for the wallet total in NGN.
export function sampleRatesFor(base: Currency): RatesResponse {
  const usdRate = (currency: Currency) =>
    currency === "USD" ? new Big(1) : drift(new Big(SAMPLE_RATES_USD.rates[currency] ?? "0"));

  const rates: Partial<Record<Currency, string>> = {};
  for (const currency of CURRENCIES) {
    if (currency === base) continue;
    rates[currency] = usdRate(currency).div(usdRate(base)).toFixed(8);
  }
  return { base, rates, timestamp: new Date().toISOString() };
}
