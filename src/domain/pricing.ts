import Big from "big.js";
import { type Currency, MINOR_DIGITS } from "./currency";
import { isUsableRate, type RatesAgainstBase } from "./rates";


export const RATE_DECIMALS = 8;

//Fee: 0.5% in basis points, so calculations stay in BigInt.
export const FEE_BPS = 50n;
const BPS_DENOMINATOR = 10_000n;

//The quoted rate is 0.5% worse for the user than mid-market.
export const SPREAD = new Big("0.005");

function unitsPerBase(rates: RatesAgainstBase, base: Currency, currency: Currency): Big {
  if (currency === base) return new Big(1);
  const rate = rates[currency];
  if (rate === undefined) throw new Error(`Missing rate for ${currency} against ${base}`);
  return new Big(rate);
}


export function midRate(rates: RatesAgainstBase, base: Currency, sell: Currency, buy: Currency): Big {
  return unitsPerBase(rates, base, buy)
    .div(unitsPerBase(rates, base, sell))
    .round(RATE_DECIMALS, Big.roundHalfEven);
}

//Applies the spread and rounds down
export function applySpread(mid: Big): Big {
  return mid.times(new Big(1).minus(SPREAD)).round(RATE_DECIMALS, Big.roundDown);
}

//Fee: 0.5% of the sell amount, rounded up, minimum 1 minor unit. Charged on top of sellAmount.
export function computeFee(sellMinor: bigint): bigint {
  const fee = (sellMinor * FEE_BPS + BPS_DENOMINATOR - 1n) / BPS_DENOMINATOR;
  return fee < 1n ? 1n : fee;
}

function pow10(digits: number): Big {
  return new Big(10).pow(digits);
}

//Rounded down so the user never receives more than the rate gives.
export function sellToBuyMinor(sellMinor: bigint, rate: Big, sell: Currency, buy: Currency): bigint {
  const buyMinor = new Big(sellMinor.toString())
    .times(rate)
    .times(pow10(MINOR_DIGITS[buy]))
    .div(pow10(MINOR_DIGITS[sell]));
  return BigInt(buyMinor.round(0, Big.roundDown).toFixed(0));
}

//Rounded up so the user always sends enough to receive the full amount.
export function buyToSellMinor(buyMinor: bigint, rate: Big, sell: Currency, buy: Currency): bigint {
  const sellMinor = new Big(buyMinor.toString())
    .div(rate)
    .times(pow10(MINOR_DIGITS[sell]))
    .div(pow10(MINOR_DIGITS[buy]));
  return BigInt(sellMinor.round(0, Big.roundUp).toFixed(0));
}


export type FixedAmount = { side: "sell"; amount: bigint } | { side: "buy"; amount: bigint };

export interface PricedConversion {
  sellAmount: bigint;
  buyAmount: bigint;
  //The rate actually applied (spread included), as an 8-dp string.
  rate: string;
  fee: bigint;
  //sellAmount + fee: what leaves the user's balance.
  totalDebit: bigint;
}

export type PriceResult =
  | { ok: true; priced: PricedConversion }
  | { ok: false; reason: "same_currency" | "non_positive_amount" | "amount_too_small" };

  //Prices a conversion from the mid-market rate: applies the spread, converts, and adds the fee.
  //Used by the quote endpoint and UI estimate so both follow the same rules.
export function priceConversion(mid: Big, sell: Currency, buy: Currency, fixed: FixedAmount): PriceResult {
  if (sell === buy) return { ok: false, reason: "same_currency" };
  if (fixed.amount <= 0n) return { ok: false, reason: "non_positive_amount" };

  //Use the rounded rate so displayed and calculated values match.
  const rateString = applySpread(mid).toFixed(RATE_DECIMALS);
  const rate = new Big(rateString);

  const sellAmount = fixed.side === "sell" ? fixed.amount : buyToSellMinor(fixed.amount, rate, sell, buy);
  const buyAmount = fixed.side === "buy" ? fixed.amount : sellToBuyMinor(fixed.amount, rate, sell, buy);

  if (sellAmount <= 0n || buyAmount <= 0n) return { ok: false, reason: "amount_too_small" };

  const fee = computeFee(sellAmount);
  return {
    ok: true,
    priced: { sellAmount, buyAmount, rate: rateString, fee, totalDebit: sellAmount + fee },
  };
}

export type EstimateResult = PriceResult | { ok: false; reason: "rate_unavailable" };

//Like priceConversion, but from a live rates payload that may be missing or contain unusable rates.
export function priceFromRates(
  rates: RatesAgainstBase,
  base: Currency,
  sell: Currency,
  buy: Currency,
  fixed: FixedAmount,
): EstimateResult {
  const needed = [sell, buy].filter((currency) => currency !== base);
  if (!needed.every((currency) => isUsableRate(rates[currency]))) return { ok: false, reason: "rate_unavailable" };
  return priceConversion(midRate(rates, base, sell, buy), sell, buy, fixed);
}
