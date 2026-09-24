import Big from "big.js";
import { type Currency, MINOR_DIGITS } from "./currency";
import type { RatesAgainstBase } from "./rates";

export interface CurrencyAmount {
  currency: Currency;
  minor: bigint;
}

export type PortfolioTotalResult =
  | { ok: true; total: bigint }
  | { ok: false; missingRates: Currency[] };

function unitsPerBase(rates: RatesAgainstBase, base: Currency, currency: Currency): Big | null {
  if (currency === base) return new Big(1);
  const rate = rates[currency];
  return rate === undefined ? null : new Big(rate);
}

//Converts all balances to the display currency and adds them together.
//Rounds only once at the end to avoid rounding errors.
export function portfolioTotal(
  balances: readonly CurrencyAmount[],
  display: Currency,
  rates: RatesAgainstBase,
  base: Currency,
): PortfolioTotalResult {
  const displayPerBase = unitsPerBase(rates, base, display);
  if (!displayPerBase) return { ok: false, missingRates: [display] };

  let totalMajor = new Big(0);
  const missingRates: Currency[] = [];

  for (const balance of balances) {
    //ZEro balance don't need a rate.
    if (balance.minor === 0n) continue;

    const currencyPerBase = unitsPerBase(rates, base, balance.currency);
    if (!currencyPerBase) {
      missingRates.push(balance.currency);
      continue;
    }

    const major = new Big(balance.minor.toString()).div(new Big(10).pow(MINOR_DIGITS[balance.currency]));
    totalMajor = totalMajor.plus(major.times(displayPerBase).div(currencyPerBase));
  }

  if (missingRates.length > 0) return { ok: false, missingRates };

  const totalMinor = totalMajor.times(new Big(10).pow(MINOR_DIGITS[display])).round(0, Big.roundHalfUp);
  return { ok: true, total: BigInt(totalMinor.toFixed(0)) };
}
